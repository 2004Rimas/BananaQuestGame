import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
if (!mongoUri) {
  console.warn('⚠️ MONGO_URI not set. Running without DB connection.');
} else {
  mongoose.connect(mongoUri)
    .then(() => {
      console.log('✅ MongoDB Connected');
      // Test the connection by trying to find documents
      return Player.find().limit(1);
    })
    .then(result => {
      console.log('📊 Database query test successful');
    })
    .catch(err => {
      console.error('❌ MongoDB Error:', err.message);
      if (err.name === 'MongoServerError') {
        console.error('💡 This might be an authentication error. Check your username and password.');
      }
    });
}


// Serve static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Define player schema
const playerSchema = new mongoose.Schema({
  name: String,
  score: Number,
  date: { type: Date, default: Date.now }
});

const Player = mongoose.model("Player", playerSchema);

// Save player data
app.post("/api/save", async (req, res) => {
  console.log('📝 Received save request:', req.body); // Debug logging
  
  const { player, score } = req.body;
  if (!player || score === undefined) {
    console.log('❌ Missing player or score in request');
    return res.status(400).json({ error: "Player name and score are required" });
  }
  
  try {
    const newPlayer = new Player({ name: player, score });
    console.log('💾 Attempting to save:', { player, score });
    const savedPlayer = await newPlayer.save();
    console.log('✅ Score saved successfully:', savedPlayer);
    res.status(201).json({ message: "Score saved!", player: savedPlayer });
  } catch (err) {
    console.error('❌ Error saving score:', err);
    if (err.name === 'ValidationError') {
      res.status(400).json({ error: "Invalid data format" });
    } else {
      res.status(500).json({ error: "Failed to save score: " + err.message });
    }
  }
});

// Fetch top players
app.get("/api/leaderboard", async (req, res) => {
  try {
    const players = await Player.find().sort({ score: -1 }).limit(5);
    res.json(players);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const PORT = process.env.PORT || 4000;

// Create server
const server = app.listen(PORT, () => {
  console.log('\n=== Server Status ===');
  console.log(`🚀 Server: Running on port ${PORT}`);
  console.log(`📡 API Endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/leaderboard`);
  console.log(`   POST http://localhost:${PORT}/api/save`);
  console.log('===================\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Try:`);
    console.error(`1. Run: npx kill-port ${PORT}`);
    console.error(`2. Or change PORT in .env to a different number`);
    process.exit(1);
  } else {
    console.error('❌ Server error:', error);
    process.exit(1);
  }
});
