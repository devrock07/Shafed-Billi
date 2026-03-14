const mongoose = require("mongoose");

const PremiumUser = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  premium: { type: Boolean, default: true },
  addedBy: String,
  addedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
});

module.exports = mongoose.model("PremiumUser", PremiumUser);
