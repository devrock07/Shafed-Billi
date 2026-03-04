module.exports = {
  name: "playerError",
  run: async (client, player, error) => {
    console.error(`Player error in guild ${player.guildId}:`, error);
  },
};
