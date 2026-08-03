const { AttachmentBuilder, MessageFlags } = require("discord.js");
const { createPlayerCard } = require("../../utils/playerCard");
const { createTrackBanner } = require("../../utils/trackBanner");
const { syncVoiceChannelStatus } = require("../../utils/voiceChannelStatus");
const { reconcilePlaybackModes } = require("../../utils/playbackModes");

const BANNER_NAME = "now-playing-banner.png";

async function refreshNowPlayingMessage(client, player, options = {}) {
  try {
    const message = player.data?.get("nowPlayingMessage");
    const track = player.queue?.current;
    if (!message || !track) return;

    await message.edit({
      components: [createPlayerCard(client, player, track, {
        bannerName: player.data.get("nowPlayingBanner") ? BANNER_NAME : null,
        controls: true,
        ...options,
      })],
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
    reconcilePlaybackModes(player);
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

      let banner = null;
      try {
        banner = await createTrackBanner(track);
      } catch (error) {
        client.logger?.log(`[Player banner] ${error.message}`, "warn");
      }

      try {
        const { checkPremium } = require("../../utils/premiumUtils");
        const { applyQualityFilters } = require("../../utils/playerUtils");
        
        let quality = "low";
        const guild = client.guilds.cache.get(player.guildId);
        
        if (guild && track.requester) {
          const isPremium = await checkPremium(client, track.requester, guild);
          console.log(`[LAVALINK] Premium check for ${track.requester.tag || track.requester.id}: ${isPremium}`);
          if (isPremium) {
            quality = "premium";
          }
        }
        
        console.log(`[LAVALINK] Applying ${quality} quality filters to player in guild ${player.guildId}`);
        // Temporarily re-enabling but with safe default to see if it works
        await applyQualityFilters(player, quality);
      } catch (error) {
        console.error("Quality filter error in playerStart:", error);
      }

      if (banner) player.data.set("nowPlayingBanner", banner);
      else player.data.delete("nowPlayingBanner");

      const payload = {
        components: [createPlayerCard(client, player, track, {
          bannerName: banner ? BANNER_NAME : null,
          controls: true,
        })],
        flags: MessageFlags.IsComponentsV2,
      };
      if (banner) payload.files = [new AttachmentBuilder(banner, { name: BANNER_NAME })];

      const message = await channel.send(payload);
      player.data.set("nowPlayingMessage", message);
    } catch (error) {
      client.logger?.log(`[Player] Could not send now-playing card: ${error.stack || error.message}`, "error");
    }
  },
  refreshNowPlayingMessage,
  updateNowPlayingButtons,
};
