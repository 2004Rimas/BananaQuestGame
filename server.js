// server.js
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import bcrypt from "bcrypt";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

import User from "./models/User.js";
import Score from "./models/Score.js"; // highest score per user (kept)
dotenv.config();

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// -----------------------
// Body parsers (important: before sessions)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -----------------------
// Session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "banana-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true, sameSite: "lax" }
  })
);

// -----------------------
// Passport init
app.use(passport.initialize());
app.use(passport.session());

// -----------------------
// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!MONGO_URI) console.warn("⚠️ MONGO_URI not found in .env");

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// -----------------------
// ScoreHistory model (stores all attempts)
const ScoreHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  score: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});
const ScoreHistory = mongoose.models.ScoreHistory || mongoose.model("ScoreHistory", ScoreHistorySchema);

// -----------------------
// Passport - Local Strategy
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email });
      if (!user) return done(null, false, { message: "Email not found" });
      if (!user.password) return done(null, false, { message: "Use Google Sign-In" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return done(null, false, { message: "Incorrect password" });

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// -----------------------
// Passport - Google Strategy
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
  console.warn("⚠️ Google OAuth env variables missing; Google Login may not work.");
}

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: GOOGLE_CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Google profile has no email"), null);

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            name: profile.displayName || email.split("@")[0],
            email,
            googleId: profile.id,
            password: null,
            avatar: profile.photos?.[0]?.value || null
          });
          console.log("Created Google user:", email);
        } else if (!user.googleId) {
          user.googleId = profile.id;
          await user.save();
          console.log("Linked Google ID for:", email);
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

// -----------------------
// Serialize / Deserialize
passport.serializeUser((user, done) => {
  done(null, user._id);
});
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).lean();
    done(null, user || null);
  } catch (err) {
    done(err, null);
  }
});

// -----------------------
// Auth helper
function ensureLogin(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  if (req.originalUrl.startsWith("/api")) {
    return res.status(401).json({ success: false, message: "Login required." });
  }
  return res.redirect("/login.html");
}

// -----------------------
// Public pages
app.get("/login.html", (req, res) => res.sendFile(path.join(__dirname, "public", "login.html")));
app.get("/signup.html", (req, res) => res.sendFile(path.join(__dirname, "public", "signup.html")));

// Protect game page
app.get(["/", "/index.html", "/index"], ensureLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// -----------------------
// Signup (local)
app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!email || !password) return res.status(400).send("Missing email or password.");

    const exists = await User.findOne({ email });
    if (exists) {
      if (exists.googleId && !exists.password) {
        return res.status(400).send("This email is registered via Google. Please use Google Sign-In.");
      }
      return res.status(400).send("Email already registered. Please login.");
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name: name || email.split("@")[0], email, password: hash });

    // Auto-login
    req.logIn(user, (err) => {
      if (err) return res.redirect("/login.html");
      return res.redirect("/index.html");
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("Server error during signup.");
  }
});

// -----------------------
// Login (local)
app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) {
      console.error("Login error:", err);
      return res.status(500).send("Server error during login.");
    }
    if (!user) {
      const msg = (info && info.message) || "Login failed.";
      return res.status(400).send(msg);
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error("req.logIn error:", err);
        return res.status(500).send("Server error during login.");
      }
      return res.redirect("/index.html");
    });
  })(req, res, next);
});

// -----------------------
// Logout
app.get("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) {
      console.error("Logout error:", err);
      return next(err);
    }
    req.session.destroy(() => {
      res.redirect("/login.html");
    });
  });
});

// -----------------------
// Google OAuth routes
app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login.html", session: true }),
  (req, res) => {
    res.redirect("/index.html");
  }
);

// -----------------------
// API: User status
app.get("/api/user-status", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user;
    return res.json({ loggedIn: true, name: user.name, id: user._id });
  }
  return res.json({ loggedIn: false });
});

// -----------------------
// API: Banana JSON proxy
app.get("/banana-json", async (req, res) => {
  try {
    const r = await fetch("https://marcconrad.com/uob/banana/api.php?out=json");
    const j = await r.json();
    return res.json(j);
  } catch (err) {
    console.error("Banana API error:", err);
    return res.status(500).json({ error: "Banana API failed" });
  }
});

// -----------------------
// API: Save score
// Stores every attempt in ScoreHistory AND updates Score (highest) collection
app.post("/api/save", ensureLogin, async (req, res) => {
  try {
    console.log(">>> /api/save - req.user:", req.user ? req.user._id : null, "body:", req.body);
    let { score } = req.body;
    score = Number(score);
    if (!Number.isFinite(score) || score < 0) {
      return res.status(400).json({ success: false, message: "Invalid score value." });
    }

    const userId = req.user._id;
    const userName = req.user.name || "Unknown";

    // Save attempt to ScoreHistory
    const hist = await ScoreHistory.create({ user: userId, name: userName, score });
    console.log("Saved ScoreHistory:", hist._id);

    // Update highest Score document (Score model)
    const existing = await Score.findOne({ user: userId });
    if (existing) {
      if (score > existing.score) {
        existing.score = score;
        existing.createdAt = new Date();
        await existing.save();
        console.log("Updated highest score:", existing.score);
      } else {
        console.log("Highest score unchanged:", existing.score);
      }
    } else {
      const s = await Score.create({ user: userId, name: userName, score });
      console.log("Created highest Score doc:", s._id);
    }

    return res.json({ success: true, message: "Score saved", score: hist });
  } catch (err) {
    console.error("Save score error:", err);
    return res.status(500).json({ success: false, message: "Server error saving score." });
  }
});

// -----------------------
// API: Leaderboard (uses Score collection - fastest)
app.get("/api/leaderboard", async (req, res) => {
  try {
    const top = await Score.find().sort({ score: -1 }).limit(10).lean();
    return res.json(top);
  } catch (err) {
    console.error("Leaderboard error:", err);
    return res.status(500).json({ success: false, message: "Error retrieving leaderboard." });
  }
});

// -----------------------
// API: My Scores (all attempts from ScoreHistory)
app.get("/api/my-scores", ensureLogin, async (req, res) => {
  try {
    const userId = req.user._id;
    const myScores = await ScoreHistory.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean();
    return res.json({ success: true, scores: myScores });
  } catch (err) {
    console.error("My scores error:", err);
    return res.status(500).json({ success: false, message: "Error fetching user scores" });
  }
});

// -----------------------
// Debug routes
app.get("/debug-session", (req, res) => {
  res.json({
    passportUser: req.user || null,
    session: req.session || null,
    authenticated: req.isAuthenticated ? req.isAuthenticated() : false
  });
});

app.get("/debug-dbinfo", (req, res) => {
  res.json({
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  });
});

// -----------------------
// Serve static (public) last
app.use(express.static(path.join(__dirname, "public")));

// -----------------------
// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}.`);
});
