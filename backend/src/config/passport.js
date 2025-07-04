require('dotenv').config();
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "/api/auth/google/callback"
  },
  function(accessToken, refreshToken, profile, cb) {
    // Extract user information from Google profile
    const user = {
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0] ? profile.photos[0].value : null
    };
    
    return cb(null, user);
  }
));

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport; 