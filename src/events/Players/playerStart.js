const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SectionBuilder
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");

module.exports = {
  name: "playerStart",
  run: async (client, player, track) => {
    if (!player || !track) return;
    
    console.log(`[LAVALINK] Player started in guild ${player.guildId} with track: ${track.title}`);

    try {
      const channel = client.channels.cache.get(player.textId);
      if (!channel) return;

      try {
        if (!player.data) player.data = new Map();
        player.data.set("lastTrack", track);
        client.voiceHealthMonitor?.updateActivity(player.guildId);
      } catch { }

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

      const container = await createNowPlayingContainer(client, player, track);

      const message = await channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });

      player.data.set("nowPlayingMessage", message);
    } catch (error) {
      console.error("Error in playerStart event:", error);
    }
  },

  updateNowPlayingButtons: async (client, player, isPaused) => {
    try {
      const message = player.data.get("nowPlayingMessage");
      if (!message || !player.queue.current) return;

      const container = await createNowPlayingContainer(client, player, player.queue.current, isPaused);

      await message.edit({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => {
        player.data.delete("nowPlayingMessage");
      });
    } catch (error) {
      console.error("Error updating now playing buttons:", error);
    }
  }
};

async function createNowPlayingContainer(client, player, track, forcePaused = null) {
  const isPaused = forcePaused !== null ? forcePaused : player.shoukaku.paused;

  const cleanAuthorName = (author) => {
    if (!author) return 'Unknown Artist';
    return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
  };

  const truncateTitle = (title, maxLength = 25) => {
    if (!title) return 'Unknown Title';
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength) + '...';
  };

  const getCleanThumbnail = (thumbnailUrl) => {
    if (!thumbnailUrl) return null;
    if (thumbnailUrl.includes('i.ytimg.com') || thumbnailUrl.includes('img.youtube.com')) {
      const videoIdMatch = thumbnailUrl.match(/vi\/([^\/]+)\//);
      if (videoIdMatch && videoIdMatch[1]) {
        return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
      }
    }
    return thumbnailUrl;
  };

  const headerDisplay = new TextDisplayBuilder()
    .setContent(`### Now Playing [${truncateTitle(track.title)}](${track.uri})`);

  const infoDisplay = new TextDisplayBuilder()
    .setContent(
      `> - **Author:** [${cleanAuthorName(track.author)}](${track.uri})\n` +
      `> - **Duration:** \`${convertTime(track.length)}\`\n` +
      `> - **Requester:** [${track.requester.username}](https://discord.com/users/${track.requester.id})`
    );

  const section = new SectionBuilder()
    .addTextDisplayComponents(headerDisplay, infoDisplay);

  const thumbnail = getCleanThumbnail(track.thumbnail || track.artworkUrl);
  if (thumbnail) {
    section.setThumbnailAccessory((thumb) => thumb.setURL(thumbnail));
  }

  const container = new ContainerBuilder()
    .addSectionComponents(section)
    .addSeparatorComponents(new SeparatorBuilder());

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("pause")
      .setEmoji(isPaused ? client.emoji.play : client.emoji.pause)
      .setLabel(isPaused ? "Resume" : "Pause")
      .setStyle(isPaused ? ButtonStyle.Success : ButtonStyle.Primary),
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
    new ButtonBuilder()
      .setCustomId("loop")
      .setEmoji(client.emoji.loop)
      .setLabel("Loop")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("autoplay")
      .setEmoji(client.emoji.dance)
      .setLabel("Autoplay")
      .setStyle(player.data.get("autoplay") ? ButtonStyle.Success : ButtonStyle.Secondary)
  );

  container.addActionRowComponents(row1);

  return container;
}
