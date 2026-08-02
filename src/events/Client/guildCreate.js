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
  name: "guildCreate",
  run: async (client, guild) => {
    const owner = await guild.fetchOwner().catch(() => null);
    const vanity = guild.vanityURLCode
      ? `[Open invite](https://discord.gg/${guild.vanityURLCode})`
      : "No vanity URL";

    const embed = new EmbedBuilder()
      .setColor(client.color)
      .setThumbnail(guild.iconURL({ size: 1024 }))
      .setDescription(
        `**${client.emoji.check} Joined a server**\n\n` +
        `**${client.emoji.dot} Server:** \`${guild.name}\`\n` +
        `**${client.emoji.dot} Server ID:** \`${guild.id}\`\n` +
        `**${client.emoji.dot} Owner:** \`${owner?.user?.username || "Unknown"}\` (${owner?.id || "N/A"})\n` +
        `**${client.emoji.dot} Members:** \`${guild.memberCount}\`\n` +
        `**${client.emoji.dot} Created:** \`${moment.utc(guild.createdAt).format("DD/MMM/YYYY")}\`\n` +
        `**${client.emoji.dot} Invite:** ${vanity}\n` +
        `**${client.emoji.dot} Total servers:** \`${client.guilds.cache.size}\``,
      )
      .setFooter({
        text: `Total server count: ${client.guilds.cache.size}`,
        iconURL: client.user.displayAvatarURL(),
      })
      .setTimestamp();

    await sendWebhook(client, "guild_join", { embeds: [embed] });

    if (!owner?.user) return;
    const support = client.config.links?.support;
    const hasSupport = isHttpUrl(support);
    const welcome = container(COLORS.success)
      .addTextDisplayComponents(text(`### ${client.emoji.check} Thanks for choosing ${client.user.username}!`))
      .addSeparatorComponents(separator())
      .addTextDisplayComponents(text(
        `${client.user.username} was successfully added to **${guild.name}**.\n\n` +
        (hasSupport
          ? `Need help? Visit our [support server](${support}).`
          : "Use the help command to explore available features."),
      ));

    if (hasSupport) {
      welcome.addActionRowComponents(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel("Support server").setStyle(ButtonStyle.Link).setURL(support),
      ));
    }

    await owner.user.send({
      components: [welcome],
      flags: MessageFlags.IsComponentsV2,
    }).catch((error) => {
      client.logger?.log(`[Guild join] Could not DM ${owner.user.username}: ${error.message}`, "debug");
    });
  },
};
