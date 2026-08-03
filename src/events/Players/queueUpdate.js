const { refreshNowPlayingMessage } = require("./playerStart");

module.exports = {
  name: "queueUpdate",
  run: async (client, player) => {
    const pending = player.data?.get("queueUiRefresh");
    if (pending) clearTimeout(pending);

    const timeout = setTimeout(() => {
      player.data?.delete("queueUiRefresh");
      refreshNowPlayingMessage(client, player).catch((error) => {
        client.logger?.log(`[Player] Queue UI refresh failed: ${error.message}`, "warn");
      });
    }, 150);
    timeout.unref?.();
    player.data?.set("queueUiRefresh", timeout);
  },
};
