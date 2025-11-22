const User = require("../models/user");
const { sendEmail } = require("../config/email");
const { passwordResetSuccessEmail } = require("../utils/emailTemplates");

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    const user = await User.findById(req.user._id);

    if (user) {
      user.fullName = fullName || user.fullName;

      if (email && email !== user.email) {
        const emailExists = await User.findOne({ email });
        if (emailExists) {
          return res.status(400).json({
            success: false,
            message: "Email already in use",
          });
        }
        user.email = email;
        user.isVerified = false;
      }

      const updatedUser = await user.save();

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        user: {
          id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
          isVerified: updatedUser.isVerified,
          avatar: updatedUser.avatar,
        },
      });
    } else {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// Change password from profile settings
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide current and new passwords",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.authProvider === "google" && !user.password) {
      return res.status(400).json({
        success: false,
        message: "Cannot change password for Google OAuth accounts",
      });
    }

    const isPasswordCorrect = await user.comparePassword(currentPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    if (!/\d/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one number",
      });
    }

    user.password = newPassword;
    await user.save();

    await sendEmail({
      email: user.email,
      subject: "Password Changed Successfully - Unibro",
      html: passwordResetSuccessEmail(user.fullName),
    });

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while changing password",
      error: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  updateProfile,
  changePassword,
};
