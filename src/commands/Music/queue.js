const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} = require("discord.js");
const { convertTime } = require("../../utils/convert");
const { safeLinkLabel } = require("../../utils/presentation");
const { container, noticePayload, separator, text } = require("../../utils/ui");

const PAGE_SIZE = 8;

function durationLabel(milliseconds) {
  return milliseconds > 0 ? convertTime(milliseconds) : "LIVE";
}

function navigation(client, page, pageCount, disabled = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("queue:first")
      .setEmoji(client.emoji.previous)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId("queue:previous")
      .setEmoji(client.emoji.previous)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page === 0),
    new ButtonBuilder()
      .setCustomId("queue:page")
      .setLabel(`${page + 1} / ${pageCount}`)
      .setStyle(ButtonStyle.Primary)
      .setDisabled(true),
    new ButtonBuilder()
      .setCustomId("queue:next")
      .setEmoji(client.emoji.play)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= pageCount - 1),
    new ButtonBuilder()
      .setCustomId("queue:last")
      .setEmoji(client.emoji.skip)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled || page >= pageCount - 1),
  );
}

function queueCard(client, player, page, disabled = false) {
  const current = player.queue.current;
  const upcoming = [...player.queue];
  const pageCount = Math.max(1, Math.ceil(upcoming.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * PAGE_SIZE;
  const tracks = upcoming.slice(start, start + PAGE_SIZE);
  const totalDuration = [current, ...upcoming].reduce((sum, track) => sum + (Number(track?.length) || 0), 0);

  const currentLine = `### [${safeLinkLabel(current.title, 64)}](${current.uri})\n` +
    `-# ${safeLinkLabel(current.author || "Unknown Artist", 50)} · ${durationLabel(current.length)}`;
  const upcomingLines = tracks.length
    ? tracks.map((track, index) => {
      const number = String(start + index + 1).padStart(2, "0");
      return `\`${number}\` **[${safeLinkLabel(track.title, 54)}](${track.uri})**  ·  \`${durationLabel(track.length)}\``;
    }).join("\n")
    : "-# The queue is empty. Add another track with the play command.";

  const card = container()
    .addTextDisplayComponents(text(
      `## Queue\n-# ${upcoming.length} upcoming · ${durationLabel(totalDuration)} total · Volume ${Math.round(player.volume ?? 100)}%`,
    ))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(`**NOW PLAYING**\n${currentLine}`))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(`**UP NEXT**\n${upcomingLines}`));

  if (pageCount > 1) {
    card.addSeparatorComponents(separator()).addActionRowComponents(navigation(client, safePage, pageCount, disabled));
  }
  return { card, page: safePage, pageCount };
}

module.exports = {
  name: "queue",
  aliases: ["q", "list"],
  category: "Music",
  description: "Browse the current track and upcoming queue",
  cooldown: 3,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const wrapper = {
      guild: interaction.guild,
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
    const player = client.manager.players.get(message.guild.id);
    if (!player?.queue?.current) {
      return message.reply(noticePayload({
        title: "The queue is empty",
        description: "Use the play command to add the first track.",
        emoji: client.emoji.info,
        tone: "info",
      }));
    }

    let page = 0;
    let view = queueCard(client, player, page);
    const queueMessage = await message.reply({
      components: [view.card],
      flags: MessageFlags.IsComponentsV2,
    });
    if (view.pageCount === 1) return queueMessage;

    const collector = queueMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      idle: 60_000,
    });

    collector.on("collect", async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply(noticePayload({
          title: "This queue view belongs to someone else",
          description: "Run the queue command to open your own controls.",
          emoji: client.emoji.warn,
          tone: "warning",
        }, true));
      }

      if (interaction.customId === "queue:first") page = 0;
      if (interaction.customId === "queue:previous") page -= 1;
      if (interaction.customId === "queue:next") page += 1;
      if (interaction.customId === "queue:last") page = view.pageCount - 1;
      view = queueCard(client, player, page);
      page = view.page;
      await interaction.update({ components: [view.card] });
    });

    collector.on("end", () => {
      view = queueCard(client, player, page, true);
      queueMessage.edit({ components: [view.card] }).catch(() => {});
    });
    return queueMessage;
  },
};
