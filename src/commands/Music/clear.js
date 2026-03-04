const { EmbedBuilder } = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
  name: "clear",
  aliases: ["cq", "clear"],
  category: "Music",
  cooldown: 3,
  description: "Removes all songs in the music queue.",
  args: false,
  usage: "",
  userPerms: [],
  owner: false,
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const interactionWrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      createdTimestamp: interaction.createdTimestamp,
      reply: async (options) => {
        if (interaction.deferred) {
          return await interaction.editReply(options);
        } else if (interaction.replied) {
          return await interaction.followUp(options);
        } else {
          return await interaction.reply(options);
        }
      },
    };

    const args = [];
    if (interaction.options) {
      const options = interaction.options.data;
      for (const option of options) {
        if (option.value !== undefined) {
          args.push(option.value.toString());
        }
      }
    }

    const prefix = client.prefix;
    return this.execute(interactionWrapper, args, client, prefix);
  },

  async execute(message, args, client, prefix) {
    const player = client.manager.players.get(message.guild.id);
    if (!player.queue.current) {
      return message.channel.send({
        embeds: [new client.embed().d(`-# **Play a song first.**`)],
      });
    }
    player.queue.clear();
    const thing = new client.embed().d(
      `-# **${client.emoji.check} Removed all songs from the queue.**`,
    );
    return message.reply({ embeds: [thing] });
  },
};
