const { Schema, model, models } = require("mongoose");

const PremiumRole = new Schema({
  Guild: { type: String, required: true, unique: true },
  RoleId: { type: String, required: true }
});

module.exports = models.premiumrole || model("premiumrole", PremiumRole);
