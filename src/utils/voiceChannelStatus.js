const { Routes } = require("discord.js");
const { cleanAuthorName, truncate } = require("./presentation");
const emoji = require("../emojis");

function cleanStatusPart(value, maxLength) {
  return truncate(String(value || "").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim(), maxLength);
}

function playbackStatus(player, track, state = "playing") {
  if (state === "idle" || !track) return `${emoji.music} Ready for music · Use /play`;
  if (state === "waiting") return `${emoji.pause} Paused · Waiting for listeners`;

  const title = cleanStatusPart(track.title || "Unknown track", 70);
  const artist = cleanStatusPart(cleanAuthorName(track.author), 38);
  const prefix = state === "paused"
    ? `${emoji.pause} Paused`
    : track.isStream ? `${emoji.music} Live` : `${emoji.music} Playing`;
  const modes = [];
  if (player.loop === "track") modes.push(`${emoji.loop} Track loop`);
  if (player.loop === "queue") modes.push(`${emoji.loop} Queue loop`);
  if (player.data?.get("autoplay")) modes.push(`${emoji.autoplay} Autoplay`);

  return `${prefix} · ${title}${artist ? ` — ${artist}` : ""}${modes.length ? ` · ${modes.join(" · ")}` : ""}`;
}

async function setVoiceChannelStatus(client, player, status) {
  const voiceId = player?.voiceId;
  if (!client?.rest || !voiceId) return false;

  const normalized = status === null ? null : cleanStatusPart(status, 500);
  if (player.data?.get("voiceChannelStatus") === normalized) return true;

  try {
    await client.rest.put(Routes.channelVoiceStatus(voiceId), {
      body: { status: normalized },
    });
    player.data?.set("voiceChannelStatus", normalized);
    player.data?.delete("voiceChannelStatusWarning");
    return true;
  } catch (error) {
    if (!player.data?.get("voiceChannelStatusWarning")) {
      const hint = error.status === 403
        ? " Grant the bot the Set Voice Channel Status permission."
        : "";
      client.logger?.log(`[Voice status] Update failed in ${player.guildId}: ${error.message}.${hint}`, "warn");
      player.data?.set("voiceChannelStatusWarning", true);
    }
    return false;
  }
}

async function syncVoiceChannelStatus(client, player, options = {}) {
  const track = options.track || player?.queue?.current;
  let state = options.state;
  if (!state) state = player?.shoukaku?.paused || player?.paused ? "paused" : "playing";
  return setVoiceChannelStatus(client, player, playbackStatus(player, track, state));
}

const clearVoiceChannelStatus = (client, player) => setVoiceChannelStatus(client, player, null);

module.exports = {
  clearVoiceChannelStatus,
  playbackStatus,
  setVoiceChannelStatus,
  syncVoiceChannelStatus,
};
