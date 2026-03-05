const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const { hasAvailableNodes } = require("../../utils/nodeUtils");

function getEngineFor(query) {
  const isUrl =
    /^https?:\/\//.test(query) ||
    query.includes("youtube.com") ||
    query.includes("youtu.be") ||
    query.includes("music.apple.com") ||
    query.includes("spotify.com") ||
    query.includes("deezer.com") ||
    query.includes("jiosaavn.com");
  return isUrl ? undefined : "ytmsearch";
}

function buildResultsContainer(client, tracks, cacheKey) {
  const lines = tracks.map((t, i) => {
    const author = (t.author || "Unknown").replace(/\s*-\s*Topic\s*$/i, "").trim();
    const title =
      t.title && t.title.length > 60 ? t.title.slice(0, 57) + "..." : t.title || "Unknown";
    return `> **${i + 1}.** ${title} — ${author} • \`${convertTime(t.length)}\``;
  });

  const info = new TextDisplayBuilder().setContent(
    `**Results**:\n${lines.join("\n")}\n\nSelect a number below to enqueue.`
  );
  const container = new ContainerBuilder().addTextDisplayComponents(info);

  const row = new ActionRowBuilder();
  tracks.slice(0, 5).forEach((_, i) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`search_${cacheKey}_${i}`)
        .setLabel(`${i + 1}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });
  container.addActionRowComponents(row);
  return container;
}

module.exports = {
  name: "search",
  description: "Search for songs and choose one to play",
  category: "Music",
  cooldown: 3,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  botPerms: ["EmbedLinks", "Connect", "Speak"],

  slashOptions: [
    {
      name: "query",
      description: "Song name or URL to search",
      type: 3,
      required: true
    }
  ],

  async slashExecute(interaction, client) {
    const query = interaction.options.getString("query");
    await interaction.deferReply();

    if (!interaction.member?.voice?.channel) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.warn} You need to be in a voice channel first.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (
      !interaction.guild.members.me.permissions.has([
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak
      ])
    ) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.warn} I need \`CONNECT\` and \`SPEAK\` permissions.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (!hasAvailableNodes(client.manager)) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.cross} The music server is unavailable. Try again later.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    let result = null;
    try {
      result = await client.manager.search(query, {
        engine: getEngineFor(query),
        requester: interaction.user
      });
    } catch (e) {
      result = { tracks: [] };
    }

    const tracks = (result.tracks || []).slice(0, 5);
    if (tracks.length === 0) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.cross} No results found for "${query}".**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return interaction.editReply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (!client.searchCache) client.searchCache = new Map();
    const cacheKey = interaction.id;
    client.searchCache.set(cacheKey, {
      userId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      tracks
    });

    const container = buildResultsContainer(client, tracks, cacheKey);
    return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client, prefix) {
    const query = args.join(" ");
    if (!query) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.dot} Usage** \`:\` \`${prefix}search [Song Name/URL]\``
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (!message.member?.voice?.channel) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.warn} You need to be in a voice channel first.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (
      !message.guild.members.me.permissions.has([
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak
      ])
    ) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.warn} I need \`CONNECT\` and \`SPEAK\` permissions.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.channel.send({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (!hasAvailableNodes(client.manager)) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.cross} The music server is unavailable. Try again later.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    let result = null;
    try {
      result = await client.manager.search(query, {
        engine: getEngineFor(query),
        requester: message.author
      });
    } catch (e) {
      result = { tracks: [] };
    }

    const tracks = (result.tracks || []).slice(0, 5);
    if (tracks.length === 0) {
      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.cross} No results found for "${query}".**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }

    if (!client.searchCache) client.searchCache = new Map();
    const cacheKey = `${Date.now()}_${message.id}`;
    client.searchCache.set(cacheKey, {
      userId: message.author.id,
      guildId: message.guild.id,
      channelId: message.channel.id,
      tracks
    });

    const container = buildResultsContainer(client, tracks, cacheKey);
    return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async componentsV2(interaction, client) {
    try {
      const parts = interaction.customId.split("_");
      if (parts.length < 3 || parts[0] !== "search") return;
      const index = parseInt(parts[parts.length - 1], 10);
      const cacheKey = parts.slice(1, parts.length - 1).join("_");

      // Acknowledge immediately to avoid "This interaction failed" toast
      try {
        await interaction.deferUpdate();
      } catch {}

      if (!client.searchCache || !client.searchCache.has(cacheKey)) {
        return interaction.followUp({
          content: `**${client.emoji.cross} This search session has expired. Please run the command again.**`,
          ephemeral: true
        });
      }

      const payload = client.searchCache.get(cacheKey);
      if (interaction.user.id !== payload.userId) {
        return interaction.followUp({
          content: `**${client.emoji.warn} Only the user who started this search can select a result.**`,
          ephemeral: true
        });
      }

      const selected = payload.tracks[index];
      if (!selected) {
        return interaction.followUp({
          content: `**${client.emoji.cross} Invalid selection.**`,
          ephemeral: true
        });
      }

      const vc = interaction.member?.voice?.channel;
      if (!vc) {
        return interaction.followUp({
          content: `**${client.emoji.warn} You must be in a voice channel.**`,
          ephemeral: true
        });
      }

      const bot = interaction.guild.members.me;
      if (
        !bot.permissions.has([
          PermissionsBitField.Flags.Connect,
          PermissionsBitField.Flags.Speak
        ])
      ) {
        return interaction.followUp({
          content: `**${client.emoji.warn} I need \`CONNECT\` and \`SPEAK\` permissions.**`,
          ephemeral: true
        });
      }

      let player = client.manager.players.get(interaction.guild.id);
      if (!player) {
        player = await client.manager.createPlayer({
          guildId: interaction.guild.id,
          voiceId: vc.id,
          textId: interaction.channel.id,
          volume: 80,
          deaf: true
        });
        try {
          client.voiceHealthMonitor?.startMonitoring(player);
        } catch {}
      } else {
        if (player.voiceId !== vc.id) {
          return interaction.reply({
            content: `**${client.emoji.warn} I'm connected to a different voice channel.**`,
            ephemeral: true
          });
        }
        if (player.textId !== interaction.channel.id) player.textId = interaction.channel.id;
      }

      const currentQueueSize = player.queue.size;
      const isPlaying = player.playing || player.paused;
      const position = currentQueueSize + (isPlaying ? 1 : 0);

      player.queue.add(selected);
      if (!player.playing && !player.paused) {
        await player.play();
      }

      const d = new TextDisplayBuilder().setContent(
        `**${client.emoji.check} Enqueued [${selected.title}](${selected.uri}) at position \`${position}\`.**`
      );
      const c = new ContainerBuilder().addTextDisplayComponents(d);

      try {
        // Edit original message to confirmation
        await interaction.message.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
      } catch {
        // Fallback: ephemeral notify
        await interaction.followUp({ components: [c], flags: MessageFlags.IsComponentsV2, ephemeral: true });
      }

      client.searchCache.delete(cacheKey);
    } catch (e) {
      try {
        await interaction.followUp({
          content: `**${client.emoji.cross} Failed to process selection.**`,
          ephemeral: true
        });
      } catch {}
    }
  }
};
