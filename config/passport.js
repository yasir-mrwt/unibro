const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/user");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      proxy: true, // ✅ Important if behind proxy (Heroku, etc.)
      passReqToCallback: false,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google OAuth Profile:", profile); // 🔍 Debug log

        // Validate required data
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("No email found in Google profile"), null);
        }

        const email = profile.emails[0].value;
        const googleId = profile.id;
        const fullName = profile.displayName || "Google User";
        const avatar = profile.photos?.[0]?.value || null;

        console.log(`Looking for user with email: ${email}`); // 🔍 Debug log

        // Check if user already exists
        let user = await User.findOne({
          $or: [{ email: email }, { googleId: googleId }],
        });

        if (user) {
          console.log("User found:", user._id); // 🔍 Debug log

          // Update existing user
          let updated = false;

          if (!user.googleId) {
            user.googleId = googleId;
            updated = true;
          }

          if (!user.isVerified) {
            user.isVerified = true;
            updated = true;
          }

          if (user.authProvider !== "google" && !user.password) {
            user.authProvider = "google";
            updated = true;
          }

          if (!user.avatar && avatar) {
            user.avatar = avatar;
            updated = true;
          }

          user.lastLogin = Date.now();
          updated = true;

          if (updated) {
            await user.save();
            console.log("User updated successfully"); // 🔍 Debug log
          }

          return done(null, user);
        }

        console.log("Creating new user..."); // 🔍 Debug log

        // Create new user
        user = await User.create({
          fullName: fullName,
          email: email,
          googleId: googleId,
          avatar: avatar,
          isVerified: true,
          authProvider: "google",
          lastLogin: Date.now(),
        });

        console.log("New user created:", user._id); // 🔍 Debug log

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth Error:", error); // 🔍 Debug log
        return done(error, null);
      }
    }
  )
);

// Serialize user for session
passport.serializeUser((user, done) => {
  console.log("Serializing user:", user._id); // 🔍 Debug log
  done(null, user._id); // Use _id instead of id
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Deserializing user:", id); // 🔍 Debug log
    const user = await User.findById(id).select("-password");
    done(null, user);
  } catch (error) {
    console.error("Deserialize error:", error); // 🔍 Debug log
    done(error, null);
  }
});

module.exports = passport;
