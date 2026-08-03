const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema({
  title: { type: String, required: true },
  url: { type: String, required: true },
  duration: { type: Number, default: 0 },
  thumbnail: { type: String, default: null },
  author: { type: String, default: "Unknown Artist" },
  addedAt: { type: Date, default: Date.now },
}, { _id: false });

const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  key: { type: String, required: true },
  tracks: { type: [trackSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const librarySchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true, index: true },
  playlists: { type: [playlistSchema], default: [] },
});

module.exports = mongoose.model("PlaylistLibrary", librarySchema);
