const mongoose = require('mongoose');

const likedSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  songs: [{
    title: { type: String, required: true },
    url: { type: String, required: true },
    duration: { type: String },
    thumbnail: { type: String },
    author: { type: String },
    addedAt: { type: Date, default: Date.now }
  }]
});



module.exports = mongoose.model('Liked', likedSchema);