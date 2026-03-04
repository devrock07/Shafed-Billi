const mongoose = require("mongoose");

const autoRoleSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
  },
  roles: {
    type: [String],
    default: [],
  },
});

module.exports = mongoose.model("AutoRole", autoRoleSchema);