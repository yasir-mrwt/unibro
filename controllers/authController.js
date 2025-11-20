const User = require("../models/user");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const { sendEmail } = require("../config/email");
const {
  welcomeEmail,
  verificationEmail,
  loginNotification,
  passwordResetEmail,
  passwordResetSuccessEmail,
  accountLockedEmail,
} = require("../utils/emailTemplates");

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { fullName, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      authProvider: "local",
    });

    const verificationToken = user.generateVerificationToken();
    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // ✅ FIX: Make email async
    sendEmail({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    }).catch(err => console.log('Verification email failed:', err.message));

    const token = generateToken(res, user._id);

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Please check your email to verify your account.",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isLocked) {
      const unlockTime = new Date(user.lockUntil).toLocaleString();
      return res.status(423).json({
        success: false,
        message: `Account is temporarily locked due to multiple failed login attempts. Please try again after ${unlockTime}`,
        lockedUntil: user.lockUntil,
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please use Google Sign-In.",
      });
    }

    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      await user.incLoginAttempts();

      const updatedUser = await User.findById(user._id);
      if (updatedUser.isLocked) {
        const unlockTime = new Date(updatedUser.lockUntil).toLocaleString();

        // ✅ FIX: Make account locked email async
        sendEmail({
          email: user.email,
          subject: "Account Locked - Unibro",
          html: accountLockedEmail(user.fullName, unlockTime),
        }).catch(err => console.log('Account locked email failed:', err.message));

        return res.status(423).json({
          success: false,
          message: `Too many failed login attempts. Your account has been locked until ${unlockTime}`,
          lockedUntil: updatedUser.lockUntil,
        });
      }

      const remainingAttempts = 5 - (updatedUser.loginAttempts || 0);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
        remainingAttempts: Math.max(0, remainingAttempts),
      });
    }

    if (user.loginAttempts > 0 || user.lockUntil) {
      await user.resetLoginAttempts();
    }

    user.lastLogin = Date.now();
    await user.save();

    const token = generateToken(res, user._id);

    const loginTime = new Date().toLocaleString();
    const ipAddress = req.ip || req.connection.remoteAddress;

    // ✅ FIX: Send email in background without awaiting
    sendEmail({
      email: user.email,
      subject: "New Login to Your Account - Unibro",
      html: loginNotification(user.fullName, loginTime, ipAddress),
    }).catch(err => console.log('Login notification email failed:', err.message));

    // ✅ RESPOND IMMEDIATELY
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    res.cookie("token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error during logout",
      error: error.message,
    });
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("Verification attempt with token:", token);

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      console.log("No user found or token expired");
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
        expired: true, // ✅ Flag to indicate token expired
      });
    }

    console.log("User found:", user.email);

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    // Reset resend attempts on successful verification
    user.verificationResendCount = 0;
    user.lastVerificationResend = undefined;
    await user.save();

    console.log("User verified successfully");

    // ✅ FIX: Make welcome email async
    sendEmail({
      email: user.email,
      subject: "Welcome to Unibro! 🎉",
      html: welcomeEmail(user.fullName),
    }).catch(err => console.log('Welcome email failed:', err.message));

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message,
    });
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Private (user must be logged in)
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Rate limiting: Check resend count (max 5 attempts per day)
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Reset count if last resend was more than 24 hours ago
    if (
      !user.lastVerificationResend ||
      user.lastVerificationResend < oneDayAgo
    ) {
      user.verificationResendCount = 0;
    }

    // Check if user exceeded limit
    if (user.verificationResendCount >= 5) {
      const timeUntilReset = new Date(
        user.lastVerificationResend.getTime() + 24 * 60 * 60 * 1000
      );
      return res.status(429).json({
        success: false,
        message: `You've reached the maximum verification email requests. Please try again after ${timeUntilReset.toLocaleString()}`,
        retryAfter: timeUntilReset,
      });
    }

    // Rate limiting: Prevent spam (minimum 2 minutes between requests)
    if (user.lastVerificationResend) {
      const timeSinceLastResend = now - user.lastVerificationResend.getTime();
      const twoMinutes = 2 * 60 * 1000;

      if (timeSinceLastResend < twoMinutes) {
        const waitTime = Math.ceil((twoMinutes - timeSinceLastResend) / 1000);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitTime} seconds before requesting another verification email`,
          waitTime,
        });
      }
    }

    // Generate new verification token
    const verificationToken = user.generateVerificationToken();

    // Update resend tracking
    user.verificationResendCount = (user.verificationResendCount || 0) + 1;
    user.lastVerificationResend = now;

    await user.save();

    // Create verification URL
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    // ✅ FIX: Make verification email async
    sendEmail({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    }).catch(err => console.log('Resend verification email failed:', err.message));

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
      remainingAttempts: 5 - user.verificationResendCount,
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending verification email",
      error: error.message,
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with that email address",
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please use Google Sign-In.",
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // ✅ FIX: Make password reset email async
    sendEmail({
      email: user.email,
      subject: "Password Reset Request - Unibro",
      html: passwordResetEmail(user.fullName, resetUrl),
    }).catch(err => console.log('Password reset email failed:', err.message));

    res.status(200).json({
      success: true,
      message: "Password reset email sent! Please check your inbox.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Error sending password reset email",
      error: error.message,
    });
  }
};

// @desc    Reset password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    user.loginAttempts = 0;
    user.lockUntil = undefined;

    await user.save();

    // ✅ FIX: Make password reset success email async
    sendEmail({
      email: user.email,
      subject: "Password Changed Successfully - Unibro",
      html: passwordResetSuccessEmail(user.fullName),
    }).catch(err => console.log('Password reset success email failed:', err.message));

    res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        avatar: user.avatar,
        authProvider: user.authProvider,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Google OAuth callback
// @route   GET /api/auth/google/callback
// @access  Public
const googleCallback = async (req, res) => {
  try {
    const token = generateToken(res, req.user._id);

    req.user.lastLogin = Date.now();
    await req.user.save();

    res.redirect(`${process.env.FRONTEND_URL}/auth/success?token=${token}`);
  } catch (error) {
    res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  getMe,
  googleCallback,
  forgotPassword,
  resetPassword,
};
