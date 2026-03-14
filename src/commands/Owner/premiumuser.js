const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const db = require("../../schema/premiumuser");
const lodash = require("lodash");

module.exports = {
  name: `premiumuser`,
  aliases: ["puser", "padd"],
  category: "Owner",
  description: "Add/remove global premium user access",
  args: false,
  usage: "<add/remove/list/status> <@user>",
  owner: true,

  slashOptions: [
    {
      name: "add",
      description: "Add a user to global premium status",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to add",
          type: 6,
          required: true
        },
        {
          name: "duration",
          description: "Duration (e.g., 24h, 10d, 2w, 1m, 1y, or 'permanent')",
          type: 3,
          required: false
        }
      ]
    },
    {
      name: "remove",
      description: "Remove a user from global premium status",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to remove",
          type: 6,
          required: true
        }
      ]
    },
    {
      name: "list",
      description: "List all global premium users",
      type: 1,
      options: []
    },
    {
      name: "status",
      description: "Check a user's global premium status",
      type: 1,
      options: [
        {
          name: "user",
          description: "User to check status for",
          type: 6,
          required: true
        }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) return;

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const durationArg = interaction.options.getString("duration");

    return this.handleCommand(interaction, user, subcommand, durationArg, client);
  },

  async execute(message, args, client, prefix) {
    if (!client.owners.includes(message.author.id)) return;

    const subcommand = args[0]?.toLowerCase();
    const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);
    const durationArg = args[2];

    if (!subcommand || !["add", "remove", "list", "status"].includes(subcommand)) {
      const usageDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.dot} Usage** \`:\` \`${prefix}premiumuser <add/remove/list/status> <@user/ID> [duration]\``);
      const container = new ContainerBuilder().addTextDisplayComponents(usageDisplay);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    return this.handleCommand(message, user, subcommand, durationArg, client);
  },

  async handleCommand(context, user, subcommand, durationArg, client) {
    const isInteraction = !!context.commandName;
    const author = isInteraction ? context.user : context.author;

    if (subcommand === "add") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Provide me a valid user.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      let expiresAt = null;
      if (durationArg && durationArg.toLowerCase() !== "permanent") {
        const duration = parseDuration(durationArg);
        if (!duration) {
          const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Invalid duration format. Use 24h, 10d, 2w, 1m, 1y.**`);
          const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
          return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
        expiresAt = new Date(Date.now() + duration);
      }

      await db.findOneAndUpdate(
        { userId: user.id },
        { 
          premium: true, 
          addedBy: author.id, 
          addedAt: new Date(), 
          expiresAt: expiresAt 
        },
        { upsert: true, new: true }
      );

      const successMessage = expiresAt 
        ? `**${client.emoji.check} Granted global premium status to ${user}, expiring <t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
        : `**${client.emoji.check} Granted permanent global premium status to ${user}.**`;

      const successDisplay = new TextDisplayBuilder().setContent(successMessage);
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
      return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "remove") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Provide me a valid user.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const result = await db.deleteOne({ userId: user.id });
      if (result.deletedCount === 0) {
        const infoDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.info} This user doesn't have global premium status.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const successDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.check} Removed global premium status from ${user}.**`);
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
      return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "status") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Provide me a valid user.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const data = await db.findOne({ userId: user.id });
      if (!data || !data.premium) {
        const infoDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.info} ${user.tag} does not have global premium status.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const statusMsg = `**${client.emoji.check} ${user.tag} has global premium status.**\n` +
                        `**Added By:** <@${data.addedBy}>\n` +
                        `**Added At:** <t:${Math.floor(data.addedAt.getTime() / 1000)}:F>\n` +
                        `**Expires:** ${data.expiresAt ? `<t:${Math.floor(data.expiresAt.getTime() / 1000)}:R>` : "Never (Permanent)"}`;

      const statusDisplay = new TextDisplayBuilder().setContent(statusMsg);
      const container = new ContainerBuilder().addTextDisplayComponents(statusDisplay);
      return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (subcommand === "list") {
      const allUsers = await db.find({ premium: true });
      if (allUsers.length === 0) {
        const infoDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.info} No users have global premium status.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
        return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const userList = allUsers.map((u, i) => `**${i + 1}.** <@${u.userId}> | \`${u.userId}\` | ${u.expiresAt ? `<t:${Math.floor(u.expiresAt.getTime() / 1000)}:R>` : "Permanent"}`).join("\n");
      const headerDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.star} Global Premium Users**`);
      const listDisplay = new TextDisplayBuilder().setContent(userList);
      const container = new ContainerBuilder().addTextDisplayComponents(headerDisplay).addSeparatorComponents(new SeparatorBuilder()).addTextDisplayComponents(listDisplay);
      return context.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }
  }
};

function parseDuration(str) {
  const regex = /^(\d+)([hdwmy])$/i;
  const match = str.match(regex);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  const units = {
    h: 3600000,
    d: 86400000,
    w: 604800000,
    m: 2592000000,
    y: 31536000000
  };

  return value * units[unit];
}
