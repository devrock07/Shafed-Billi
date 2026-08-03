module.exports = {
  name: "playerEmpty",
  run: async (client, player) => {
    console.log(`Queue empty in guild: ${player.guildId}`);
    try {
      const { attemptAutoplay } = require("../../utils/playerUtils");
      await attemptAutoplay(client, player);
    } catch (e) {
      client.logger?.log(`[Autoplay] playerEmpty hook error: ${e.message}`, "error");
    }
    if (!player.queue?.current && !player.playing) {
      const { syncVoiceChannelStatus } = require("../../utils/voiceChannelStatus");
      await syncVoiceChannelStatus(client, player, { state: "idle" });
    }
  },
};
