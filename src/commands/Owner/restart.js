const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");

module.exports = {
  name: "restart",
  category: "Owner",
  aliases: ["reboot"],
  description: "Restart the bot",
  args: false,
  usage: "",
  owner: true,

  slashOptions: [],
  async slashExecute(interaction, client) {
    if (!client.owners.includes(interaction.user.id)) {
      return;
    }

    const playingGuilds = [...client.manager.players]
      .map((e) => e[1])
      .filter((p) => p.playing)
      .map((p) => p.guildId);

    const guilds = [];
    for (const id of playingGuilds) {
      const guild = client.guilds.cache.get(id);
      if (guild) {
        guilds.push(
          `\`${guilds.length.toString().padStart(2, '0')}.\` ${guild.name.substring(0, 15)} [\`${guild.memberCount}\`]`
        );
      }
    }

    let confirmDisplay;

    if (guilds.length === 0) {
      confirmDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Currently playing in no servers.**\n` +
          `**${client.emoji.info} Do you want to restart the bot?**`
        );
    } else {
      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Currently playing in:**`);

      const separator = new SeparatorBuilder();

      const guildsDisplay = new TextDisplayBuilder()
        .setContent(guilds.join('\n'));

      const separator2 = new SeparatorBuilder();

      confirmDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Do you want to restart the bot?**`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("restart")
        .setEmoji(client.emoji.check)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
    );

    let container;
    if (guilds.length === 0) {
      const separator = new SeparatorBuilder();

      container = new ContainerBuilder()
        .addTextDisplayComponents(confirmDisplay)
        .addSeparatorComponents(separator)
        .addActionRowComponents(row);
    } else {
      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Currently playing in:**`);

      const separator = new SeparatorBuilder();

      const guildsDisplay = new TextDisplayBuilder()
        .setContent(guilds.join('\n'));

      const separator2 = new SeparatorBuilder();

      const confirmDisplay2 = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Do you want to restart the bot?**`);

      const separator3 = new SeparatorBuilder();

      container = new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(guildsDisplay)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(confirmDisplay2)
        .addSeparatorComponents(separator3)
        .addActionRowComponents(row);
    }

    const msg = await interaction.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({
      filter: (i) => {
        if (i.user.id === interaction.user.id) return true;

        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} You can't use this button.**`);

        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        i.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return false;
      },
      time: 60000,
    });

    collector.on("collect", async (i) => {
      if (!i.deferred) await i.deferUpdate();

      if (i.customId === "restart") {
        const shardCount = client.cluster.info.TOTAL_SHARDS;
        const serverCount = client.guilds.cache.size;
        const activePlayerCount = playingGuilds.length;

        const etaSeconds = Math.ceil(5 + (shardCount * 1) + (activePlayerCount * 0.5));

        const restartHeader = new TextDisplayBuilder()
          .setContent(`**${client.emoji.load} Restarting all Shards**`);

        const separator = new SeparatorBuilder();

        const restartInfo = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.info} Total Shards** \`:\` \`${shardCount}\`\n` +
            `**${client.emoji.info} Total Servers** \`:\` \`${serverCount}\`\n` +
            `**${client.emoji.info} Active Players** \`:\` \`${activePlayerCount}\`\n` +
            `**${client.emoji.info} ETA** \`:\` \`${etaSeconds}s\``
          );


        const restartContainer = new ContainerBuilder()
          .addTextDisplayComponents(restartHeader)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(restartInfo);

        await msg.edit({
          components: [restartContainer],
          flags: MessageFlags.IsComponentsV2
        });

        console.log("Restarting all shards...");
        await client.cluster.respawnAll();
      } else if (i.customId === "cancel") {
        collector.stop();

        const cancelDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Restart operation cancelled.**`);

        const cancelContainer = new ContainerBuilder()
          .addTextDisplayComponents(cancelDisplay);

        await msg.edit({
          components: [cancelContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timeoutDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Restart operation timed out.**`);

        const timeoutContainer = new ContainerBuilder()
          .addTextDisplayComponents(timeoutDisplay);

        msg.edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }
    });
  },
  async execute(message, args, client) {
    if (!client.owners.includes(message.author.id)) {
      return;
    }

    const playingGuilds = [...client.manager.players]
      .map((e) => e[1])
      .filter((p) => p.playing)
      .map((p) => p.guildId);

    const guilds = [];
    for (const id of playingGuilds) {
      const guild = client.guilds.cache.get(id);
      if (guild) {
        guilds.push(
          `\`${guilds.length.toString().padStart(2, '0')}.\` ${guild.name.substring(0, 15)} [\`${guild.memberCount}\`]`
        );
      }
    }

    let confirmDisplay;

    if (guilds.length === 0) {
      confirmDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.warn} Currently playing in no servers.**\n` +
          `**${client.emoji.info} Do you want to restart the bot?**`
        );
    } else {
      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Currently playing in:**`);

      const separator = new SeparatorBuilder();

      const guildsDisplay = new TextDisplayBuilder()
        .setContent(guilds.join('\n'));

      const separator2 = new SeparatorBuilder();

      confirmDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Do you want to restart the bot?**`);
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("restart")
        .setEmoji(client.emoji.check)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("cancel")
        .setEmoji(client.emoji.cross)
        .setStyle(ButtonStyle.Secondary),
    );

    let container;
    if (guilds.length === 0) {
      const separator = new SeparatorBuilder();

      container = new ContainerBuilder()
        .addTextDisplayComponents(confirmDisplay)
        .addSeparatorComponents(separator)
        .addActionRowComponents(row);
    } else {
      const headerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.info} Currently playing in:**`);

      const separator = new SeparatorBuilder();

      const guildsDisplay = new TextDisplayBuilder()
        .setContent(guilds.join('\n'));

      const separator2 = new SeparatorBuilder();

      const confirmDisplay2 = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} Do you want to restart the bot?**`);

      const separator3 = new SeparatorBuilder();

      container = new ContainerBuilder()
        .addTextDisplayComponents(headerDisplay)
        .addSeparatorComponents(separator)
        .addTextDisplayComponents(guildsDisplay)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(confirmDisplay2)
        .addSeparatorComponents(separator3)
        .addActionRowComponents(row);
    }

    const msg = await message.reply({
      components: [container],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = msg.createMessageComponentCollector({
      filter: (interaction) => {
        if (interaction.user.id === message.author.id) return true;

        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} You can't use this button.**`);

        const errorContainer = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        interaction.reply({
          components: [errorContainer],
          flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
        });
        return false;
      },
      time: 60000,
    });

    collector.on("collect", async (interaction) => {
      if (!interaction.deferred) await interaction.deferUpdate();

      if (interaction.customId === "restart") {
        const shardCount = client.cluster.info.TOTAL_SHARDS;
        const serverCount = client.guilds.cache.size;
        const activePlayerCount = playingGuilds.length;

        const etaSeconds = Math.ceil(5 + (shardCount * 1) + (activePlayerCount * 0.5));

        const restartHeader = new TextDisplayBuilder()
          .setContent(`**${client.emoji.load} Restarting all Shards**`);

        const separator = new SeparatorBuilder();

        const restartInfo = new TextDisplayBuilder()
          .setContent(
            `**${client.emoji.info} Total Shards** \`:\` \`${shardCount}\`\n` +
            `**${client.emoji.info} Total Servers** \`:\` \`${serverCount}\`\n` +
            `**${client.emoji.info} Active Players** \`:\` \`${activePlayerCount}\`\n` +
            `**${client.emoji.info} ETA** \`:\` \`${etaSeconds}s\``
          );


        const restartContainer = new ContainerBuilder()
          .addTextDisplayComponents(restartHeader)
          .addSeparatorComponents(separator)
          .addTextDisplayComponents(restartInfo);

        await msg.edit({
          components: [restartContainer],
          flags: MessageFlags.IsComponentsV2
        });

        console.log("Restarting all shards...");
        await client.cluster.respawnAll();
      } else if (interaction.customId === "cancel") {
        collector.stop();

        const cancelDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Restart operation cancelled.**`);

        const cancelContainer = new ContainerBuilder()
          .addTextDisplayComponents(cancelDisplay);

        await msg.edit({
          components: [cancelContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timeoutDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} Restart operation timed out.**`);

        const timeoutContainer = new ContainerBuilder()
          .addTextDisplayComponents(timeoutDisplay);

        msg.edit({
          components: [timeoutContainer],
          flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
      }
    });
  },
};
