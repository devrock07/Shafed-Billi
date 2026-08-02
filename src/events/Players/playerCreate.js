const { refreshNowPlayingMessage } = require("./playerStart");
const { syncVoiceChannelStatus } = require("../../utils/voiceChannelStatus");

module.exports = {
  name: "playerCreate",
  run: async (client, player) => {
    if (!player.data) player.data = new Map();
    if (!player.data.get("volumeUiHook")) {
      const setVolume = player.setVolume.bind(player);
      player.setVolume = async (volume) => {
        const result = await setVolume(volume);
        await refreshNowPlayingMessage(client, player);
        return result;
      };
      player.data.set("volumeUiHook", true);
    }

    const track = player.queue?.current;
    await syncVoiceChannelStatus(client, player, {
      track,
      state: track ? "playing" : "idle",
    });
  },
};
