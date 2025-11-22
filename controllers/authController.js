const User = require("../models/user");
const crypto = require("crypto");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../config/email");
const {
  welcomeEmail,
  verificationEmail,
  loginNotification,
  passwordResetEmail,
  passwordResetSuccessEmail,
  accountLockedEmail,
} = require("../utils/emailTemplates");

// Simple token generator for Google OAuth (no HTTP-only cookies)
const generateSimpleToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// Register new user
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

    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    });

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
    res.status(500).json({
      success: false,
      message: "Server error during registration",
      error: error.message,
    });
  }
};

// Login user
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
        message: `Account is temporarily locked. Please try again after ${unlockTime}`,
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

        await sendEmail({
          email: user.email,
          subject: "Account Locked - Unibro",
          html: accountLockedEmail(user.fullName, unlockTime),
        });

        return res.status(423).json({
          success: false,
          message: `Too many failed login attempts. Account locked until ${unlockTime}`,
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

    await sendEmail({
      email: user.email,
      subject: "New Login to Your Account - Unibro",
      html: loginNotification(user.fullName, loginTime, ipAddress),
    });

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
    res.status(500).json({
      success: false,
      message: "Server error during login",
      error: error.message,
    });
  }
};

// Logout user
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

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({
      verificationToken: token,
      verificationTokenExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
        expired: true,
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpire = undefined;
    user.verificationResendCount = 0;
    user.lastVerificationResend = undefined;
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: "Welcome to Unibro! 🎉",
        html: welcomeEmail(user.fullName),
      });
    } catch (emailError) {}

    return res.status(200).json({
      success: true,
      message: "Email verified successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error during verification",
      error: error.message,
    });
  }
};

// Resend verification email
const resendVerification = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    if (
      !user.lastVerificationResend ||
      user.lastVerificationResend < oneDayAgo
    ) {
      user.verificationResendCount = 0;
    }

    if (user.verificationResendCount >= 5) {
      const timeUntilReset = new Date(
        user.lastVerificationResend.getTime() + 24 * 60 * 60 * 1000
      );
      return res.status(429).json({
        success: false,
        message: `Maximum verification email requests reached. Try again after ${timeUntilReset.toLocaleString()}`,
        retryAfter: timeUntilReset,
      });
    }

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

    const verificationToken = user.generateVerificationToken();

    user.verificationResendCount = (user.verificationResendCount || 0) + 1;
    user.lastVerificationResend = now;

    await user.save();

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${verificationToken}`;

    await sendEmail({
      email: user.email,
      subject: "Verify Your Email - Unibro",
      html: verificationEmail(user.fullName, verificationUrl),
    });

    res.status(200).json({
      success: true,
      message: "Verification email sent! Please check your inbox.",
      remainingAttempts: 5 - user.verificationResendCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending verification email",
      error: error.message,
    });
  }
};

// Forgot password
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

    await sendEmail({
      email: user.email,
      subject: "Password Reset Request - Unibro",
      html: passwordResetEmail(user.fullName, resetUrl),
    });

    res.status(200).json({
      success: true,
      message: "Password reset email sent! Please check your inbox.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error sending password reset email",
      error: error.message,
    });
  }
};

// Reset password
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

    await sendEmail({
      email: user.email,
      subject: "Password Changed Successfully - Unibro",
      html: passwordResetSuccessEmail(user.fullName),
    });

    res.status(200).json({
      success: true,
      message:
        "Password reset successful! You can now login with your new password.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

// Get current logged in user
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

// Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.FRONTEND_URL}/auth/error`);
    }

    const token = generateSimpleToken(req.user._id);

    req.user.lastLogin = Date.now();
    const isNewUser =
      !req.user.lastLogin ||
      Date.now() - new Date(req.user.createdAt).getTime() < 60000;

    await req.user.save();

    try {
      if (isNewUser) {
        await sendEmail({
          email: req.user.email,
          subject: "Welcome to Unibro! 🎉",
          html: welcomeEmail(req.user.fullName),
        });
      } else {
        const loginTime = new Date().toLocaleString();
        const ipAddress = req.ip || req.connection?.remoteAddress || "Unknown";

        await sendEmail({
          email: req.user.email,
          subject: "New Login to Your Account - Unibro",
          html: loginNotification(req.user.fullName, loginTime, ipAddress),
        });
      }
    } catch (emailError) {}

    const redirectUrl = `${process.env.FRONTEND_URL}/auth/success?token=${token}`;
    res.redirect(redirectUrl);
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
