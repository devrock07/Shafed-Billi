const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require("discord.js");
const { checkPremium } = require("../../utils/premiumUtils");
const play = require("./play");

module.exports = {
  name: "pmusic",
  category: "Music",
  aliases: ["pp", "premiumplay"],
  cooldown: 3,
  description: "Premium music play",
  inVoiceChannel: true,
  sameVoiceChannel: true,
  botPerms: ["EmbedLinks", "Connect", "Speak"],
  slashOptions: [
    {
      name: "song",
      description: "Song name or URL to play",
      type: 3,
      required: true,
      autocomplete: true
    }
  ],
  autocomplete: play.autocomplete,
  async slashExecute(interaction, client) {
    const isPremium = await checkPremium(client, interaction.user, interaction.guild);
    
    if (!isPremium) {
      const d = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Premium-only command**\n> You need to be a global premium user or have the server's premium role to use this command.`);
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    }
    return play.slashExecute(interaction, client);
  },
  async execute(message, args, client, prefix) {
    const isPremium = await checkPremium(client, message.author, message.guild);

    if (!isPremium) {
      const d = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Premium-only command**\n> You need to be a global premium user or have the server's premium role to use this command.`);
      const c = new ContainerBuilder().addTextDisplayComponents(d);
      return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
    }
    return play.execute(message, args, client, prefix);
  }
};
