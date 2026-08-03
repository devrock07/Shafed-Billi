const { MessageFlags } = require("discord.js");
const { container, text } = require("../../utils/ui");
const { playPreviousTrack } = require("../../utils/previousTrack");

module.exports = {
  name: "previous",
  aliases: ["back", "prev", "rewind"],
  category: "Music",
  cooldown: 3,
  description: "Play the previous song from history",
  player: true,
  inVoiceChannel: true,
  sameVoiceChannel: true,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const wrapper = {
      guild: interaction.guild,
      author: interaction.user,
      reply: (options) => interaction.reply(options),
    };
    return this.execute(wrapper, [], client);
  },

  async execute(message, _args, client) {
    const player = client.manager.players.get(message.guild.id);
    try {
      const track = await playPreviousTrack(player, message.author);
      return message.reply({
        components: [container().addTextDisplayComponents(
          text(`### ${client.emoji.check} Previous track\n[${track.title}](${track.uri}) is now playing.`),
        )],
        flags: MessageFlags.IsComponentsV2,
      });
    } catch (error) {
      const known = error.code === "NO_HISTORY" || error.code === "NOT_FOUND";
      return message.reply({
        components: [container().addTextDisplayComponents(
          text(`### ${known ? client.emoji.info : client.emoji.cross} Previous track unavailable\n${known ? error.message : "The track could not be restored. Please try again."}`),
        )],
        flags: MessageFlags.IsComponentsV2,
      });
    }
  },
};
