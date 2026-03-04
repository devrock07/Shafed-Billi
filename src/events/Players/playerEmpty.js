module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    // Basic playerEmpty logic
    console.log(`Queue empty in guild: ${player.guildId}`);
  },
};
