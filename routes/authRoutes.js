const express = require("express");
const router = express.Router();
const passport = require("passport");
const {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification, // ✅ NEW
  getMe,
  googleCallback,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const {
  registerValidation,
  loginValidation,
  validate,
} = require("../middleware/validation");

// @route   POST /api/auth/register
router.post("/register", registerValidation, validate, register);

// @route   POST /api/auth/login
router.post("/login", loginValidation, validate, login);

// @route   POST /api/auth/logout
router.post("/logout", protect, logout);

// @route   GET /api/auth/verify-email/:token
router.get("/verify-email/:token", verifyEmail);

// @route   POST /api/auth/verify-email/:token
router.post("/resend-verification", protect, resendVerification); // ✅ NEW

// @route   GET /api/auth/me
router.get("/me", protect, getMe);

// @route   POST /api/auth/forgot-password
router.post("/forgot-password", forgotPassword);

// @route   PUT /api/auth/reset-password/:token
router.put("/reset-password/:token", resetPassword);

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/auth/error`,
    session: false,
  }),
  googleCallback
);

module.exports = router;
