const {
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");
const db = require("../../schema/noprefix");
const lodash = require("lodash");

module.exports = {
  name: `nopaccess`,
  aliases: ["nopperms", "nop"],
  category: "Owner",
  description: "Add/remove global no-prefix access",
  args: false,
  usage: "<add/remove> <@user>",
  owner: true,

  slashOptions: [
    {
      name: "add",
      description: "Add a user to global no-prefix access",
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
      description: "Remove a user from global no-prefix access",
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
      name: "clear",
      description: "Remove all users from global no-prefix access",
      type: 1,
      options: []
    },
    {
      name: "list",
      description: "List all users with global no-prefix access",
      type: 1,
      options: []
    },
    {
      name: "status",
      description: "Check a user's global no-prefix access status",
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
    if (!client.owners.includes(interaction.user.id)) {
      return;
    }

    const subcommand = interaction.options.getSubcommand();
    const user = interaction.options.getUser("user");
    const durationArg = interaction.options.getString("duration");

    if (subcommand === "add") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Provide me a valid user.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let expiresAt = null;

      if (durationArg) {
        const durationLower = durationArg.toLowerCase();

        if (durationLower === 'p' || durationLower === 'perm' || durationLower === 'permanent') {
          expiresAt = null;
        } else {
          const match = durationArg.match(/^(\d+)(h|hr|hrs|d|day|w|week|m|y|yr|yrs)$/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();

            const now = Date.now();
            let milliseconds = 0;

            if (unit === 'h' || unit === 'hr' || unit === 'hrs') {
              milliseconds = value * 60 * 60 * 1000;
            }
            else if (unit === 'd' || unit === 'day') {
              milliseconds = value * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'w' || unit === 'week') {
              milliseconds = value * 7 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'm') {
              milliseconds = value * 30 * 24 * 60 * 60 * 1000;
            }
            else if (unit === 'y' || unit === 'yr' || unit === 'yrs') {
              milliseconds = value * 365 * 24 * 60 * 60 * 1000;
            }

            expiresAt = new Date(now + milliseconds);
          } else {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
                `**${client.emoji.warn} Invalid duration format.**\n` +
                `**Examples:**\n` +
                `\`24h\` or \`24hrs\` - 24 hours\n` +
                `\`10d\` or \`10day\` - 10 days\n` +
                `\`2w\` or \`2week\` - 2 weeks\n` +
                `\`1m\` - 1 month\n` +
                `\`1y\` or \`1yr\` - 1 year\n` +
                `\`permanent\` or \`perm\` or \`p\` - Permanent`
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      }

      const npData = await db.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (npData) {
        let newExpiresAt = null;

        if (expiresAt === null && npData.expiresAt === null) {
          newExpiresAt = null;
        } else if (expiresAt === null) {
          newExpiresAt = null;
        } else if (npData.expiresAt === null) {
          newExpiresAt = null;
        } else {
          const now = Date.now();
          const existingExpiry = new Date(npData.expiresAt).getTime();
          const remainingTime = Math.max(0, existingExpiry - now);
          const newDuration = expiresAt.getTime() - now;
          newExpiresAt = new Date(now + remainingTime + newDuration);
        }

        await db.updateOne(
          { userId: user.id, guildId: "GLOBAL", noprefix: true },
          { expiresAt: newExpiresAt }
        );

        const successMessage = newExpiresAt
          ? `**${client.emoji.check} Extended ${user}'s No Prefix Access, Expiring**\n**<t:${Math.floor(newExpiresAt.getTime() / 1000)}:R>.**`
          : `**${client.emoji.check} Updated ${user}'s No Prefix Access To Permanent.**`;

        const successDisplay = new TextDisplayBuilder()
          .setContent(successMessage);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      await db.create({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true,
        expiresAt: expiresAt,
      });

      const successMessage = expiresAt
        ? `**${client.emoji.check} Granted ${user} No Prefix Access, Expiring**\n**<t:${Math.floor(expiresAt.getTime() / 1000)}:R>.**`
        : `**${client.emoji.check} Granted ${user} No Prefix Access To Permanent.**`;

      const successDisplay = new TextDisplayBuilder()
        .setContent(successMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "remove") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Provide me a valid user.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const npData = await db.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} This user doesn't have No Prefix Access.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      await db.deleteOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully removed ${user} from No Prefix Access.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "clear") {
      const result = await db.deleteMany({
        guildId: "GLOBAL",
        noprefix: true
      });

      const count = result.deletedCount || 0;

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully removed \`${count}\` user${count !== 1 ? 's' : ''} from No Prefix Access.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(successDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "status") {
      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Provide me a valid user.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const npData = await db.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} ${user} does not have No Prefix Access.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let statusMessage;
      if (npData.expiresAt) {
        const expiryTimestamp = Math.floor(new Date(npData.expiresAt).getTime() / 1000);
        const now = Date.now();
        const expiryTime = new Date(npData.expiresAt).getTime();

        if (expiryTime <= now) {
          statusMessage = `**${client.emoji.info} ${user}'s No Prefix Access has expired.**`;
        } else {
          statusMessage = `**${client.emoji.check} ${user} has No Prefix Access, Expiring <t:${expiryTimestamp}:R>.**`;
        }
      } else {
        statusMessage = `**${client.emoji.check} ${user} has Permanent No Prefix Access.**`;
      }

      const statusDisplay = new TextDisplayBuilder()
        .setContent(statusMessage);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(statusDisplay);

      return interaction.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (subcommand === "list") {
      const data = await db.find({
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!data.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} There are no users with No Prefix Access.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return interaction.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const usersPerPage = 10;
      const pages = Math.ceil(data.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = data.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (x, i) => {
            const user = await client.users.fetch(x.userId).catch(() => null);
            const userName = user ? `${user.tag} (\`${user.id}\`)` : `Unknown User (\`${x.userId}\`)`;

            let expiryText = '';
            if (x.expiresAt) {
              const expiryTimestamp = Math.floor(new Date(x.expiresAt).getTime() / 1000);
              expiryText = ` - <t:${expiryTimestamp}:R>`;
            } else {
              expiryText = ' - Permanent';
            }

            return `**\`${start + i + 1}\` | ${userName}${expiryText}**`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} No Prefix User List**`);

        const separator = new SeparatorBuilder();

        const listDisplay = new TextDisplayBuilder()
          .setContent(userList.join('\n'));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay);
      };

      const components = [await createContainer(currentPage)];

      if (pages > 1) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('home')
            .setLabel('Home')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('prev')
            .setLabel('Previous')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('next')
            .setLabel('Next')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId('close')
            .setLabel('Close')
            .setStyle(ButtonStyle.Danger)
        );
        components.push(row);
      }

      const msg = await interaction.reply({
        components,
        flags: MessageFlags.IsComponentsV2
      });

      if (pages > 1) {
        const collector = msg.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 60000
        });

        collector.on('collect', async (i) => {
          if (i.customId === 'close') {
            collector.stop();
            return await i.message.delete().catch(() => { });
          } else if (i.customId === 'home') {
            currentPage = 0;
          } else if (i.customId === 'prev') {
            currentPage = (currentPage - 1 + pages) % pages;
          } else if (i.customId === 'next') {
            currentPage = (currentPage + 1) % pages;
          }

          const updatedComponents = [await createContainer(currentPage)];
          if (pages > 1) {
            updatedComponents.push(components[1]);
          }

          await i.update({
            components: updatedComponents,
            flags: MessageFlags.IsComponentsV2
          });
        });

        collector.on('end', async () => {
          const finalComponents = [await createContainer(currentPage)];
          msg.edit({ components: finalComponents }).catch(() => { });
        });
      }
    }
  },
  async execute(message, args, client, prefix) {
    if (!client.owners.includes(message.author.id)) {
      return;
    }

    if (!args[0]) {
      const helpHeader = new TextDisplayBuilder()
        .setContent(`\`\`\`<> = Required Argument\nDo NOT type these when using commands!\`\`\``);

      const separator = new SeparatorBuilder();

      const usageDisplay = new TextDisplayBuilder()
        .setContent(
          `**Usage:**\n` +
          `\`${prefix}nop add @user [duration]\` - Give global no-prefix access\n` +
          `  **Duration:** \`24h/hrs\`, \`10d/day\`, \`2w/week\`, \`1m\` (month), \`1y/yr\`, \`p/perm/permanent\`\n` +
          `\`${prefix}nop remove @user\` - Remove global no-prefix access\n` +
          `\`${prefix}nop remove all\` - Remove all users\n` +
          `\`${prefix}nop list\` - List users with global access\n` +
          `\`${prefix}nop status @user\` - Check user's no-prefix status`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(helpHeader)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(usageDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const opt = args[0].toLowerCase();

    if (opt === `add` || opt === `a` || opt === `+`) {
      const user =
        message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please provide a valid user to add.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let expiresAt = null;
      const durationArg = args[2];

      if (durationArg) {
        const durationLower = durationArg.toLowerCase();

        if (['p', 'perm', 'permanent'].includes(durationLower)) {
          expiresAt = null;
        } else {
          const match = durationArg.match(/^(\d+)(h|hr|hrs|d|day|days|w|week|weeks|m|month|months|y|yr|yrs|year|years)$/i);
          if (match) {
            const value = parseInt(match[1]);
            const unit = match[2].toLowerCase();
            const now = Date.now();
            let milliseconds = 0;

            if (unit.startsWith('h')) milliseconds = value * 3_600_000;
            else if (unit.startsWith('d')) milliseconds = value * 86_400_000;
            else if (unit.startsWith('w')) milliseconds = value * 604_800_000;
            else if (unit.startsWith('m')) milliseconds = value * 2_592_000_000; // 30 days
            else if (unit.startsWith('y')) milliseconds = value * 31_536_000_000; // 365 days

            expiresAt = new Date(now + milliseconds);
          } else {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(
                `**${client.emoji.warn} Invalid duration format provided.**\n` +
                `**Examples:** \`24h\`, \`10d\`, \`2w\`, \`1m\`, \`1y\`, \`perm\``
              );

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return message.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }
      }

      // Upsert logic to handle both create and update
      // If we are extending an existing expiration, we need to fetch first or calculate based on current time
      // For simplicity and "sexy" logic, if the user exists, we set the NEW expiration from NOW (or extending if desired, but user asked for "add").
      // The previous logic attempted to add to remaining time. Let's keep that logic if possible but safer.

      const existingData = await db.findOne({ userId: user.id });
      let newExpiresAt = expiresAt;

      if (existingData && existingData.expiresAt && expiresAt) {
        // If already has expiry and we are adding more time
        const now = Date.now();
        const currentExpiry = new Date(existingData.expiresAt).getTime();
        // If expired, start from now. If not, add to existing.
        const startTime = currentExpiry > now ? currentExpiry : now;
        const addedDuration = expiresAt.getTime() - now; // Duration derived from args
        newExpiresAt = new Date(startTime + addedDuration);
      } else if (existingData && existingData.expiresAt === null) {
        // If already permanent, keep it permanent unless explicitly set (logic choice: permanent overrides duration add)
        if (expiresAt !== null) {
          // If try to add duration to permanent, ignore or notify?
          // Let's assume re-setting to duration if provided, OR keeping perm.
          // "Add" usually means "grant access".
          // Let's just set strictly to what is asked or keep perm if no duration.
          if (durationArg) newExpiresAt = expiresAt; // Overwrite perm with duration? Or keep perm?
          else newExpiresAt = null; // Keep perm
        } else {
          newExpiresAt = null;
        }
      }

      await db.findOneAndUpdate(
        { userId: user.id },
        {
          userId: user.id,
          guildId: "GLOBAL",
          noprefix: true,
          expiresAt: newExpiresAt
        },
        { upsert: true, new: true }
      );

      const successMessage = newExpiresAt
        ? `**${client.emoji.check} ${user} has been granted No Prefix Access.**\n**Expires:** <t:${Math.floor(newExpiresAt.getTime() / 1000)}:R>`
        : `**${client.emoji.check} ${user} has been granted Permanent No Prefix Access.**`;

      const successDisplay = new TextDisplayBuilder().setContent(successMessage);
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (opt === `remove` || opt === `r` || opt === `-`) {
      if (args[1]?.toLowerCase() === 'all') {
        const result = await db.deleteMany({ guildId: "GLOBAL", noprefix: true });
        const count = result.deletedCount || 0;

        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Revoked No Prefix Access from \`${count}\` users.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);

        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const user = message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please provide a valid user to remove.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const result = await db.deleteOne({ userId: user.id });

      if (result.deletedCount === 0) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} ${user} does not have No Prefix Access.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const successDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.check} Successfully revoked No Prefix Access from ${user}.**`);
      const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
      return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (opt === `list` || opt === `show`) {
      // Reuse the listing logic from slash command or create a shared function
      // For now, copying logic for consistency
      const data = await db.find({ guildId: "GLOBAL", noprefix: true });

      if (!data.length) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} No users currently have No Prefix Access.**`);
        const container = new ContainerBuilder().addTextDisplayComponents(infoDisplay);
        return message.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
      }

      const usersPerPage = 10;
      const pages = Math.ceil(data.length / usersPerPage);
      let currentPage = 0;

      const createContainer = async (page) => {
        const start = page * usersPerPage;
        const end = start + usersPerPage;
        const currentUsers = data.slice(start, end);

        const userList = await Promise.all(
          currentUsers.map(async (x, i) => {
            const user = await client.users.fetch(x.userId).catch(() => null);
            const userName = user ? `${user.tag} (\`${user.id}\`)` : `Unknown (\`${x.userId}\`)`;
            const expiry = x.expiresAt ? `<t:${Math.floor(new Date(x.expiresAt).getTime() / 1000)}:R>` : '`Permanent`';
            return `\`${start + i + 1}.\` ${userName} • ${expiry}`;
          })
        );

        const headerDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Global No Prefix Access List**`);
        const separator = new SeparatorBuilder();
        const listDisplay = new TextDisplayBuilder().setContent(userList.join('\n'));

        return new ContainerBuilder()
          .addTextDisplayComponents(headerDisplay)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(listDisplay);
      };

      const components = [await createContainer(currentPage)];

      if (pages > 1) {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('prev').setLabel('Previous').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('next').setLabel('Next').setStyle(ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger)
        );
        components.push(row);
      }

      const msg = await message.reply({ components, flags: MessageFlags.IsComponentsV2 });

      if (pages > 1) {
        const collector = msg.createMessageComponentCollector({
          filter: (i) => i.user.id === message.author.id,
          time: 60000
        });

        collector.on('collect', async (i) => {
          if (i.customId === 'close') {
            collector.stop();
            return i.message.delete().catch(() => { });
          }
          if (i.customId === 'prev') currentPage = (currentPage - 1 + pages) % pages;
          if (i.customId === 'next') currentPage = (currentPage + 1) % pages;

          const updatedComponents = [await createContainer(currentPage)];
          if (pages > 1) updatedComponents.push(components[1]);

          await i.update({ components: updatedComponents, flags: MessageFlags.IsComponentsV2 });
        });
      }
    }

    if (opt === `status` || opt === `s` || opt === `check`) {
      const user =
        message.mentions.users.first() || await client.users.fetch(args[1]).catch(() => null);

      if (!user) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please provide a valid user to check.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const npData = await db.findOne({
        userId: user.id,
        guildId: "GLOBAL",
        noprefix: true
      });

      if (!npData) {
        const infoDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.info} ${user} does not have No Prefix Access.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(infoDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      let statusMessage;
      if (npData.expiresAt) {
        const expiryTimestamp = Math.floor(new Date(npData.expiresAt).getTime() / 1000);
        const now = Date.now();
        const expiryTime = new Date(npData.expiresAt).getTime();

        if (expiryTime <= now) {
          statusMessage = `**${client.emoji.info} ${user}'s No Prefix Access has expired.**`;
        } else {
          statusMessage = `**${client.emoji.check} ${user} has No Prefix Access.**\n**Expires:** <t:${expiryTimestamp}:R>`;
        }
      } else {
        statusMessage = `**${client.emoji.check} ${user} has Permanent No Prefix Access.**`;
      }

      const statusDisplay = new TextDisplayBuilder().setContent(statusMessage);
      const container = new ContainerBuilder().addTextDisplayComponents(statusDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }
  }
};