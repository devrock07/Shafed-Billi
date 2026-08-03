const { AttachmentBuilder, MessageFlags } = require("discord.js");
const { createPlayerCard } = require("../../utils/playerCard");
const { createTrackBanner } = require("../../utils/trackBanner");
const { noticePayload } = require("../../utils/ui");

const BANNER_NAME = "now-playing-banner.png";

module.exports = {
  name: "nowplaying",
  aliases: ["np", "current"],
  category: "Music",
  description: "Show the current track and playback details",
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

    let banner = player.data?.get("nowPlayingBanner") || null;
    if (!banner) {
      try {
        banner = await createTrackBanner(track);
      } catch (error) {
        client.logger?.log(`[Player banner] ${error.message}`, "warn");
      }
    }

    const payload = {
      components: [createPlayerCard(client, player, track, {
        bannerName: banner ? BANNER_NAME : null,
      })],
      flags: MessageFlags.IsComponentsV2,
    };
    if (banner) payload.files = [new AttachmentBuilder(banner, { name: BANNER_NAME })];

    const response = await message.reply(payload);
    return response;
  },
};
