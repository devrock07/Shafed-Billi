const { MessageFlags } = require("discord.js");
const { createPlayerCard } = require("../../utils/playerCard");
const { syncVoiceChannelStatus } = require("../../utils/voiceChannelStatus");

async function refreshNowPlayingMessage(client, player, options = {}) {
  try {
    const message = player.data?.get("nowPlayingMessage");
    const track = player.queue?.current;
    if (!message || !track) return;

    await message.edit({
      components: [createPlayerCard(client, player, track, { controls: true, ...options })],
      flags: MessageFlags.IsComponentsV2,
    });
  } catch (error) {
    player.data?.delete("nowPlayingMessage");
    client.logger?.log(`[Player] Could not refresh controls: ${error.message}`, "warn");
  }
}

async function updateNowPlayingButtons(client, player, isPaused) {
  await syncVoiceChannelStatus(client, player, { state: isPaused ? "paused" : "playing" });
  return refreshNowPlayingMessage(client, player, { paused: isPaused });
}

module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    if (!player || !track) return;
    if (!player.data) player.data = new Map();
    await syncVoiceChannelStatus(client, player, { track, state: "playing" });
    const lastTrack = player.data.get("lastTrack");
    const changed = lastTrack && (lastTrack.identifier || lastTrack.uri) !== (track.identifier || track.uri);
    if (changed) {
      const history = [...(player.data.get("history") || []), lastTrack].slice(-50);
      player.data.set("history", history);
    }
    player.data.set("lastTrack", track);

    const channel = client.channels.cache.get(player.textId);
    if (!channel) return;

    try {
      client.voiceHealthMonitor?.updateActivity(player.guildId);

      const previous = player.data.get("nowPlayingMessage");
      if (previous?.deletable) await previous.delete().catch(() => {});

      const message = await channel.send({
        components: [createPlayerCard(client, player, track, { controls: true })],
        flags: MessageFlags.IsComponentsV2,
      });
      player.data.set("nowPlayingMessage", message);
    } catch (error) {
      client.logger?.log(`[Player] Could not send now-playing card: ${error.stack || error.message}`, "error");
    }
  },
  refreshNowPlayingMessage,
  updateNowPlayingButtons,
};
