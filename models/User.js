import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },

  email: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // Local password users →
  password: { type: String },

  // Google OAuth users →
  googleId: { type: String },

  avatar: { type: String },

  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", UserSchema);
