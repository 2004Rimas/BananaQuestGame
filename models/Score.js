import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true },
  score: { type: Number, required: true },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Score", ScoreSchema);
