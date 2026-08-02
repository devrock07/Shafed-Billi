const { MessageFlags } = require("discord.js");
const { createPlayerCard } = require("../../utils/playerCard");
const { noticePayload } = require("../../utils/ui");

module.exports = {
  name: "nowplaying",
  aliases: ["np", "current"],
  category: "Music",
  description: "Show the current track and live playback progress",
  cooldown: 3,
  player: true,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [],

  async slashExecute(interaction, client) {
    const wrapper = {
      guild: interaction.guild,
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
    const track = player?.queue?.current;
    if (!track) {
      return message.reply(noticePayload({
        title: "Nothing is playing",
        description: "Start a track with the play command and it will appear here.",
        emoji: client.emoji.info,
        tone: "info",
      }));
    }

    const response = await message.reply({
      components: [createPlayerCard(client, player, track)],
      flags: MessageFlags.IsComponentsV2,
    });
    return response;
  },
};
