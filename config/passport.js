const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

/**
 * Google OAuth Strategy Configuration
 * Handles user authentication via Google OAuth 2.0
 */
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true, // Required for proxy environments (Heroku, etc.)
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Validate required email data from Google profile
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("No email found in Google profile"), null);
        }

        const email = profile.emails[0].value;
        const googleId = profile.id;
        const fullName = profile.displayName || "Google User";
        const avatar = profile.photos?.[0]?.value || null;

        /**
         * Find existing user by email or Google ID
         * Prevents duplicate accounts for same user
         */
        let user = await User.findOne({
          $or: [{ email: email }, { googleId: googleId }],
        });

        if (user) {
          // Update existing user with Google OAuth data
          let updated = false;

          // Add Google ID if missing
          if (!user.googleId) {
            user.googleId = googleId;
            updated = true;
          }

          // Mark as verified if not already
          if (!user.isVerified) {
            user.isVerified = true;
            updated = true;
          }

          // Set auth provider to Google if not set and no password exists
          if (user.authProvider !== "google" && !user.password) {
            user.authProvider = "google";
            updated = true;
          }

          // Update avatar if available and not set
          if (!user.avatar && avatar) {
            user.avatar = avatar;
            updated = true;
          }

          // Update last login timestamp
          user.lastLogin = Date.now();
          updated = true;

          // Save updates if any changes were made
          if (updated) {
            await user.save();
          }

          return done(null, user);
        }

        /**
         * Create new user for first-time Google OAuth login
         */
        user = await User.create({
          fullName: fullName,
          email: email,
          googleId: googleId,
          avatar: avatar,
          isVerified: true,
          authProvider: "google",
          lastLogin: Date.now(),
        });

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth Error:", error);
        return done(error, null);
      }
    }
  )
);

/**
 * Serialize user ID to session
 * Stores minimal user data in session for performance
 */
passport.serializeUser((user, done) => {
  done(null, user._id); // Use MongoDB _id for session storage
});

/**
 * Deserialize user from session ID
 * Retrieves full user data from database when needed
 */
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select("-password"); // Exclude password for security
    done(null, user);
  } catch (error) {
    console.error("Deserialize error:", error);
    done(error, null);
  }
});

module.exports = passport;
