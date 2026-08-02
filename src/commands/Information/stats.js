const os = require("os");
const mongoose = require("mongoose");
const {
  ActionRowBuilder,
  MessageFlags,
  StringSelectMenuBuilder,
  version: discordVersion,
} = require("discord.js");
const { container, separator, text } = require("../../utils/ui");

const mb = (bytes = 0) => `${Math.round(bytes / 1024 / 1024).toLocaleString()} MB`;

const duration = (milliseconds = 0) => {
  const total = Math.floor(milliseconds / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean).join(" ");
};

const value = (input, fallback = "Unavailable") => input ?? fallback;

module.exports = {
  name: "stats",
  category: "Information",
  description: "Show bot, music, system, and Lavalink statistics",
  aliases: ["statistics", "botinfo", "bi"],
  cooldown: 3,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const wrapper = {
      author: interaction.user,
      reply: async (options) => {
        if (interaction.replied || interaction.deferred) await interaction.editReply(options);
        else await interaction.reply(options);
        return interaction.fetchReply();
      },
    };
    return this.execute(wrapper, [], client);
  },

  async execute(message, _args, client) {
    const loading = await message.reply({
      components: [container().addTextDisplayComponents(text(`### ${client.emoji.load} Loading statistics`))],
      flags: MessageFlags.IsComponentsV2,
    });

    const players = [...(client.manager?.players?.values?.() || [])];
    const node = client.manager?.shoukaku?.nodes?.values?.().next()?.value;
    const nodeStats = node?.stats || {};
    const memory = process.memoryUsage();
    const users = client.guilds.cache.reduce((count, guild) => count + (guild.memberCount || 0), 0);
    const queued = players.reduce((count, player) => count + (player.queue?.size || 0), 0);
    const commands = client.commands?.size || 0;
    const cpu = os.cpus()[0]?.model?.trim() || "Unavailable";

    const pages = {
      overview: {
        label: "Overview",
        description: "Bot and Discord totals",
        emoji: client.emoji.info,
        content:
          `**Servers**  \`${client.guilds.cache.size.toLocaleString()}\`\n` +
          `**Users**  \`${users.toLocaleString()}\`\n` +
          `**Channels**  \`${client.channels.cache.size.toLocaleString()}\`\n` +
          `**Commands**  \`${commands.toLocaleString()}\`\n` +
          `**Gateway**  \`${Math.max(0, Math.round(client.ws.ping || 0))} ms\`\n` +
          `**Uptime**  \`${duration(client.uptime)}\``,
      },
      music: {
        label: "Music",
        description: "Players and queues",
        emoji: client.emoji.music,
        content:
          `**Players**  \`${players.length}\`\n` +
          `**Playing**  \`${players.filter((player) => player.playing && !player.paused).length}\`\n` +
          `**Paused**  \`${players.filter((player) => player.paused).length}\`\n` +
          `**Queued tracks**  \`${queued}\`\n` +
          `**Active node**  \`${value(node?.name)}\`\n` +
          `**Node state**  \`${value(node?.state, "Disconnected")}\``,
      },
      system: {
        label: "System",
        description: "Runtime and memory",
        emoji: client.emoji.config,
        content:
          `**Platform**  \`${os.platform()} ${os.arch()}\`\n` +
          `**CPU**  \`${cpu.slice(0, 58)}\`\n` +
          `**Process memory**  \`${mb(memory.rss)}\`\n` +
          `**Heap**  \`${mb(memory.heapUsed)} / ${mb(memory.heapTotal)}\`\n` +
          `**Node.js**  \`${process.version}\`\n` +
          `**discord.js**  \`v${discordVersion}\``,
      },
      node: {
        label: "Lavalink",
        description: "Audio node health",
        emoji: client.emoji.filters,
        content:
          `**Node**  \`${value(node?.name)}\`\n` +
          `**State**  \`${value(node?.state, "Disconnected")}\`\n` +
          `**Players**  \`${value(nodeStats.players, 0)}\`\n` +
          `**Playing**  \`${value(nodeStats.playingPlayers, 0)}\`\n` +
          `**Memory used**  \`${mb(nodeStats.memory?.used)}\`\n` +
          `**Database**  \`${mongoose.connection.readyState === 1 ? mongoose.connection.name : "Disconnected"}\``,
      },
    };

    let currentPage = "overview";
    const customId = `stats_select_${message.author.id}`;

    const render = (page, disabled = false) => {
      const selected = pages[page] || pages.overview;
      const menu = new StringSelectMenuBuilder()
        .setCustomId(disabled ? "stats_select_disabled" : customId)
        .setPlaceholder(disabled ? "Statistics menu expired" : "Choose a statistics page")
        .setDisabled(disabled)
        .addOptions(Object.entries(pages).map(([key, item]) => ({
          label: item.label,
          description: item.description,
          value: key,
          emoji: item.emoji,
          default: key === page,
        })));

      return container()
        .addTextDisplayComponents(text(`## ${selected.emoji} ${selected.label}`))
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(text(selected.content))
        .addSeparatorComponents(separator())
        .addTextDisplayComponents(text(`-# Requested by ${message.author.username}`))
        .addActionRowComponents(new ActionRowBuilder().addComponents(menu));
    };

    await loading.edit({ components: [render(currentPage)], flags: MessageFlags.IsComponentsV2 });

    const collector = loading.createMessageComponentCollector({
      filter: (interaction) => interaction.customId === customId,
      time: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        await interaction.reply({ content: "This statistics menu belongs to another user.", ephemeral: true });
        return;
      }

      currentPage = interaction.values[0];
      await interaction.update({ components: [render(currentPage)], flags: MessageFlags.IsComponentsV2 });
    });

    collector.on("end", () => {
      loading.edit({ components: [render(currentPage, true)], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  },
};
