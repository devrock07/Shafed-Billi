const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
  name: "skipto",
  aliases: ["jump"],
  category: "Music",
  description: "Skip to a specific song in the queue",
  args: true,
  usage: "<position>",
  userPrams: [],
  botPrams: ["EMBED_LINKS"],
  dj: true,
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,

  slashOptions: [
    {
      name: "position",
      description: "Position in queue to skip to",
      type: 4, // INTEGER
      required: true
    }
  ],

  async slashExecute(interaction, client) {
    const player = client.manager.players.get(interaction.guild.id);
    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.cross} Play a song first!**`);
      const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const position = interaction.options.getInteger("position");
    if (position < 1 || position > player.queue.length) {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Please provide a valid position**\n**Valid range** \`:\` \`1-${player.queue.length}\``);
      const container = new ContainerBuilder().addTextDisplayComponents(warnDisplay);
      return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    const queueIndex = position - 1;
    const targetSong = player.queue[queueIndex];
    if (queueIndex > 0) player.queue.splice(0, queueIndex);
    await player.skip();

    const successDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.check} Skipped to \`${targetSong.title}\`**`);
    const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
    return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);

    if (!player.queue.current) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Play a song first!**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const position = Number(args[0]);

    if (isNaN(position) || position < 1 || position > player.queue.length) {
      const warnDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Please provide a valid position**\n` +
          `**Valid range** \`:\` \`1-${player.queue.length}\``
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(warnDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }


    const queueIndex = position - 1;
    const targetSong = player.queue[queueIndex];

    if (!targetSong) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} Could not find song at position \`${position}\`**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (queueIndex > 0) {
      player.queue.splice(0, queueIndex);
    }

    await player.skip();

    const successDisplay = new TextDisplayBuilder()
      .setContent(`**${client.emoji.check} Skipped to \`${targetSong.title}\`**`);

    const container = new ContainerBuilder()
      .addTextDisplayComponents(successDisplay);

    return message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });
  },
};
