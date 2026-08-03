const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  SectionBuilder,
} = require("discord.js");
const { artworkUrl, cleanAuthorName, safeLinkLabel } = require("./presentation");
const { container, separator, text } = require("./ui");

function requesterLine(track) {
  const requester = track?.requester;
  if (!requester) return "Unknown";
  const name = requester.username || requester.displayName || "Listener";
  return requester.id ? `[${name}](https://discord.com/users/${requester.id})` : name;
}

function controls(client, player, paused) {
  const loopMode = player.loop || "none";
  const playback = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("previous")
      .setEmoji(client.emoji.previous)
      .setLabel("Previous")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("pause")
      .setEmoji(paused ? client.emoji.play : client.emoji.pause)
      .setLabel(paused ? "Resume" : "Pause")
      .setStyle(paused ? ButtonStyle.Success : ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("skip")
      .setEmoji(client.emoji.skip)
      .setLabel("Skip")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("stop")
      .setEmoji(client.emoji.stop)
      .setLabel("Stop")
      .setStyle(ButtonStyle.Danger),
  );

  const modes = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("loop")
      .setEmoji(client.emoji.loop)
      .setLabel(loopMode === "none" ? "Loop" : `Loop: ${loopMode}`)
      .setStyle(loopMode === "none" ? ButtonStyle.Secondary : ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("autoplay")
      .setEmoji(client.emoji.autoplay || client.emoji.dance)
      .setLabel("Autoplay")
      .setStyle(player.data?.get("autoplay") ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  return [playback, modes];
}

function createPlayerCard(client, player, track, options = {}) {
  const paused = options.paused ?? Boolean(player.shoukaku?.paused);
  const title = safeLinkLabel(track.title, 52);
  const uri = track.uri || "https://discord.com";

  const heading = text(`## ${paused ? "Paused" : "Now playing"}\n### [${title}](${uri})`);
  const details = text(
    `**Artist**  [${safeLinkLabel(cleanAuthorName(track.author), 45)}](${uri})\n` +
    `**Requested by**  ${requesterLine(track)}\n` +
    `**Volume**  ${Math.round(player.volume ?? 100)}%  •  **Queue**  ${player.queue?.length || 0} upcoming` +
    (track.isStream ? "  •  **LIVE**" : ""),
  );
  const artwork = artworkUrl(track);
  const card = container();
  if (options.bannerName) {
    card
      .addTextDisplayComponents(text(`## ${paused ? "Paused" : "Now playing"}`))
      .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(
        new MediaGalleryItemBuilder()
          .setURL(`attachment://${options.bannerName}`)
          .setDescription(`${title} artwork banner`),
      ))
      .addTextDisplayComponents(text(`### [${title}](${uri})`), details);
  } else if (artwork) {
    const section = new SectionBuilder()
      .addTextDisplayComponents(heading, details)
      .setThumbnailAccessory((thumbnail) => thumbnail.setURL(artwork));
    card.addSectionComponents(section);
  } else {
    card.addTextDisplayComponents(heading, details);
  }
  if (options.controls) {
    card.addSeparatorComponents(separator()).addActionRowComponents(...controls(client, player, paused));
  }

  return card;
}

module.exports = { createPlayerCard };
