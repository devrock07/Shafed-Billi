module.exports = {
  name: "playerEnd",
  run: async (client, player) => {
    try {
      const message = player.data.get("nowPlayingMessage");
      if (message) {
        await message.delete().catch(() => { });
        player.data.delete("nowPlayingMessage");
      }
      try {
        const { attemptAutoplay } = require("../../utils/playerUtils");
        await attemptAutoplay(client, player);
      } catch (e) {
        client.logger?.log(`[Autoplay] playerEnd hook error: ${e.message}`, "error");
      }
      if (!player.queue?.current && !player.playing) {
        const { syncVoiceChannelStatus } = require("../../utils/voiceChannelStatus");
        await syncVoiceChannelStatus(client, player, { state: "idle" });
      }
    } catch (error) {
      console.error("Error in playerEnd event:", error);
    }
  },
};
