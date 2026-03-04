const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const { convertTime } = require("../../utils/convert.js");
const ms = require("ms");
const emoji = require("../../emojis");

module.exports = {
  name: "seek",
  aliases: [],
  category: "Music",
  cooldown: 3,
  description: "Seek the currently playing song",
  args: true,
  usage: "40 || 1:30 || 10s || 1m || 1h to seek",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  slashOptions: [
    {
      name: "time",
      description: "Time to seek to (e.g. 40, 1:30, 10s, 1m)",
      type: 3, // STRING
      required: true
    }
  ],

  async slashExecute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Play a song first.**`);
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const timeInput = interaction.options.getString("time");
    let time;

    if (/^\d+$/.test(timeInput)) {
      time = parseInt(timeInput) * 1000;
    } else if (/^\d+:\d+$/.test(timeInput)) {
      const [minutes, seconds] = timeInput.split(':').map(Number);
      time = (minutes * 60 + seconds) * 1000;
    } else if (/^\d+:\d+:\d+$/.test(timeInput)) {
      const [hours, minutes, seconds] = timeInput.split(':').map(Number);
      time = (hours * 3600 + minutes * 60 + seconds) * 1000;
    } else {
      time = ms(timeInput);
    }

    if (!time || isNaN(time)) {
      const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Invalid time format. Examples: \`40\`, \`1:30\`, \`10s\`, \`1m\`**`);
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const position = player.shoukaku.position;
    const duration = player.queue.current.length;
    const song = player.queue.current;

    if (time <= duration) {
      await player.shoukaku.seekTo(time);
      const action = time > position ? "Forward" : "Rewind";
      const successDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.check} ${action}** \`:\` [${song.title}](${song.uri})\n` +
          `**Position** \`:\` \`${convertTime(time)} / ${convertTime(duration)}\``
        );
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    } else {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Seek duration exceeds song duration**\n**Song duration** \`:\` \`${convertTime(duration)}\``);
      const container = new ContainerBuilder().addTextDisplayComponents(warnDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Play a song first.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    let time;
    const input = args[0];

    if (/^\d+$/.test(input)) {
      time = parseInt(input) * 1000;
    } else if (/^\d+:\d+$/.test(input)) {
      const [minutes, seconds] = input.split(':').map(Number);
      time = (minutes * 60 + seconds) * 1000;
    } else if (/^\d+:\d+:\d+$/.test(input)) {
      const [hours, minutes, seconds] = input.split(':').map(Number);
      time = (hours * 3600 + minutes * 60 + seconds) * 1000;
    } else {
      time = ms(input);
    }

    if (!time || isNaN(time)) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Invalid time format. Examples: \`40\`, \`1:30\`, \`10s\`, \`1m\`**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const position = player.shoukaku.position;
    const duration = player.queue.current.length;
    const song = player.queue.current;

    if (time <= duration) {
      if (time > position) {
        await player.shoukaku.seekTo(time);

        const successDisplay = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.check} Forward** \`:\` [${song.title}](${song.uri})\n` +
            `**Position** \`:\` \`${convertTime(time)} / ${convertTime(duration)}\``
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } else {
        await player.shoukaku.seekTo(time);

        const successDisplay = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.check} Rewind** \`:\` [${song.title}](${song.uri})\n` +
            `**Position** \`:\` \`${convertTime(time)} / ${convertTime(duration)}\``
          );

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }
    } else {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Seek duration exceeds song duration**\n` +
          `**Song duration** \`:\` \`${convertTime(duration)}\``
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(warnDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  },
};
