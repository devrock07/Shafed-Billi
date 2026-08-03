const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const moment = require("moment-timezone");
const { COLORS, container, separator, text } = require("../../utils/ui");
const { isHttpUrl, sendWebhook } = require("../../utils/webhooks");

module.exports = {
  name: "guildDelete",
  run: async (client, guild) => {
    const owner = await guild.fetchOwner().catch(() => null);
    const embed = new EmbedBuilder()
      .setColor(COLORS.danger)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setDescription(
        `**${client.emoji.cross} Left a server**\n\n` +
        `**${client.emoji.dot} Server:** \`${guild.name}\`\n` +
        `**${client.emoji.dot} Server ID:** \`${guild.id}\`\n` +
        `**${client.emoji.dot} Owner:** \`${owner?.user?.username || "Unknown"}\` (${owner?.id || "N/A"})\n` +
        `**${client.emoji.dot} Members:** \`${guild.memberCount}\`\n` +
        `**${client.emoji.dot} Created:** \`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\`\n` +
        `**${client.emoji.dot} Total servers:** \`${client.guilds.cache.size}\``,
      )
      .setFooter({
        text: `Total server count: ${client.guilds.cache.size}`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await sendWebhook(client, "guild_leave", { embeds: [embed] });
    if (!owner?.user) return;

    const support = client.config.links?.support;
    const hasSupport = isHttpUrl(support);
    const inviteUrl = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
    const goodbye = container(COLORS.danger)
      .addTextDisplayComponents(text(`### ${client.emoji.info} ${client.user.username} was removed`))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(
        `Sorry to see you leave **${guild.name}**.${hasSupport ? ` Feedback is welcome in our [support server](${support}).` : ""}`,
      ));

    const buttons = [new ButtonBuilder().setLabel("Invite again").setStyle(ButtonStyle.Link).setURL(inviteUrl)];
    if (hasSupport) {
      buttons.unshift(new ButtonBuilder().setLabel("Support server").setStyle(ButtonStyle.Link).setURL(support));
    }
    goodbye.addActionRowComponents(new ActionRowBuilder().addComponents(buttons));

    await owner.user.send({
      components: [goodbye],
      flags: MessageFlags.IsComponentsV2,
    }).catch((error) => {
      client.logger?.log(`[Guild leave] Could not DM ${owner.user.username}: ${error.message}`, "debug");
    });
  },
};
