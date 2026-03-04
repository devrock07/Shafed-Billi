const mongoose = require(`mongoose`);
const noprefix = new mongoose.Schema({
  noprefix: Boolean,
  userId: String,
  guildId: String,
  expiresAt: {
    type: Date,
    default: null,
  },
});
module.exports = mongoose.model("Noprefix", noprefix);
