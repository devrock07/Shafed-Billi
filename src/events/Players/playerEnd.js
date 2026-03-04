module.exports = {
  name: "playerEnd",
  run: async (client, player) => {
    try {
      const message = player.data.get("nowPlayingMessage");
      if (message) {
        await message.delete().catch(() => { });
        player.data.delete("nowPlayingMessage");
      }
    } catch (error) {
      console.error("Error in playerEnd event:", error);
    }
  },
};
