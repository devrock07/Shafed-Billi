const { Schema, model, models } = require("mongoose");

const autoReconnect = new Schema({
  Guild: {
    type: String,
    required: true,
  },
  TextId: {
    type: String,
    required: true,
  },
  VoiceId: {
    type: String,
    required: true,
  },
});

module.exports = models.autoreconnect || model("autoreconnect", autoReconnect);
