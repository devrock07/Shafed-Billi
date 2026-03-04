const {
  PermissionsBitField,
  WebhookClient,
  EmbedBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require("discord.js");
const PrefixSchema = require("../../schema/prefix.js");
const BlacklistSchema = require("../../schema/blacklist");
const IgnoreChannelModel = require("../../schema/ignorechannel");
const NoPrefixSchema = require("../../schema/noprefix");
const cooldowns = new Map();

module.exports = {
  name: "messageCreate",
  once: false,
  run: async (client, message) => {
    if (message.author.bot || !message.guild) return;

    const isIgnored = await IgnoreChannelModel.findOne({
      guildId: message.guild.id,
      channelId: message.channel.id
    });
    if (isIgnored) {
      return;
    }

    let prefix = client.prefix;
    const prefixData = await PrefixSchema.findOne({ Guild: message.guild.id });
    if (prefixData?.Prefix) prefix = prefixData.Prefix;

    const mention = new RegExp(`^<@!?${client.user.id}>( |)$`);
    if (message.content.match(mention)) {
      if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages) || !message.guild.members.me.permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
        return;
      }

      const greetDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.check} Hey ${message.author}!**\n` +
          `**${client.emoji.info} My prefix for this server is  **\`${prefix}\`\n\n` +
          `**${client.emoji.info} Type \`${prefix}help\` for a list of commands.**`
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(greetDisplay);

      await message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
      return;
    }

    const hasNoPrefix = await NoPrefixSchema.findOne({
      userId: message.author.id,
      guildId: "GLOBAL",
      noprefix: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: Date.now() } }
      ]
    });

    let usedPrefix = '';
    if (message.content.startsWith(prefix)) {
      usedPrefix = prefix;
    } else if (message.content.match(new RegExp(`^<@!?${client.user.id}>`))) {
      usedPrefix = message.content.match(new RegExp(`^<@!?${client.user.id}>`))[0];
    } else if (!hasNoPrefix) {
      return;
    }

    const args = message.content.slice(usedPrefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = client.commands.get(commandName)
      || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;

    const isBlacklisted = await BlacklistSchema.findOne({ userId: message.author.id });
    if (isBlacklisted) {
      const blacklistDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} You have been blacklisted from using the bot!**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(blacklistDisplay);

      const reply = await message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
      if (reply) setTimeout(() => reply.delete().catch(() => { }), 5000);
      return;
    }

    if (!cooldowns.has(command.name)) {
      cooldowns.set(command.name, new Map());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.name);
    const cooldownAmount = (command.cooldown || 3) * 1000;

    if (timestamps.has(message.author.id)) {
      const expirationTime = timestamps.get(message.author.id) + cooldownAmount;

      if (now < expirationTime) {
        const timeLeft = ((expirationTime - now) / 1000).toFixed(1);

        const cooldownDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} Please wait ${timeLeft}s before using \`${command.name}\` command again.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(cooldownDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        }).then((msg) => {
          const delayTime = expirationTime - now;
          setTimeout(() => {
            msg.delete().catch(() => { });
          }, delayTime);
        });
      }
    }
    timestamps.set(message.author.id, now);
    setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.SendMessages)) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} I don't have \`SEND_MESSAGES\` permission in ${message.guild.name} to execute the \`${command.name}\` command.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return await message.author.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => { });
    }

    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.EmbedLinks)) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} I don't have \`EMBED_LINKS\` permission in this channel to execute the \`${command.name}\` command.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return await message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => { });
    }

    if (command.args && !args.length) {
      let reply = `You didn't provide any arguments, ${message.author}!`;
      if (command.usage) {
        reply += `\nUsage: \`${prefix}${command.name} ${command.usage}\``;
      }

      const argsDisplay = new TextDisplayBuilder()
        .setContent(reply);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(argsDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    if (command.botPerms && !message.guild.members.me.permissions.has(PermissionsBitField.resolve(command.botPerms || []))) {
      const permDisplay = new TextDisplayBuilder()
        .setContent(`I need the **\`${command.botPerms.join(', ')}\`** permission(s) to execute this command.`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(permDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    if (command.userPerms && !message.member.permissions.has(PermissionsBitField.resolve(command.userPerms || []))) {
      const permDisplay = new TextDisplayBuilder()
        .setContent(`You need the **\`${command.userPerms.join(', ')}\`** permission(s) to use this command.`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(permDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    if (command.owner && !client.config.ownerID.includes(message.author.id)) {
      return;
    }

    const player = client.manager.players.get(message.guild.id);
    if (command.player && !player) {
      const playerDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} There is no music player active in this server.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(playerDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    if (command.inVoiceChannel && !message.member.voice.channel) {
      const vcDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} You must be in a voice channel to use this command.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(vcDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    if (command.sameVoiceChannel && player && message.member.voice.channel.id !== player.voiceId) {
      const sameVcDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} You must be in the same voice channel as me.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(sameVcDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => null);
    }

    try {
      await command.execute(message, args, client, prefix);

      if (client.config.Webhooks?.cmdrun) {
        const web = new WebhookClient({ url: client.config.Webhooks.cmdrun });

        const commandlog = new EmbedBuilder()
          .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL({ dynamic: true }) })
          .setColor(client.color)
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setTimestamp()
          .setDescription(
            `**${client.emoji.dot} Command Used In:** \`${message.guild.name} | ${message.guild.id}\`\n` +
            `**${client.emoji.dot} Channel:** \`${message.channel.name} | ${message.channel.id}\`\n` +
            `**${client.emoji.dot} Command:** \`${command.name}\`\n` +
            `**${client.emoji.dot} Executor:** \`${message.author.tag} | ${message.author.id}\`\n` +
            `**${client.emoji.dot} Content:** \`${message.content}\``
          );

        web.send({ embeds: [commandlog] }).catch((e) => client.logger.log(e, "error"));
      }
    } catch (error) {
      client.logger.log(`Error executing command ${command.name}: ${error.stack}`, "error");

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} An error occurred while executing this command!**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      try {
        await message.channel.send({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (sendError) {
        client.logger.log(`Failed to send error message: ${sendError}`, "error");
      }
    }
  },
};