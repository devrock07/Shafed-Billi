const {
  CommandInteraction,
  InteractionType,
  PermissionFlagsBits,
  PermissionsBitField,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
} = require("discord.js");
const db = require("../../schema/prefix.js");
const db3 = require("../../schema/setup");

module.exports = {
  name: "interactionCreate",
  run: async (client, interaction) => {
    let prefix = client.prefix;
    const ress = await db.findOne({ Guild: interaction.guildId });
    if (ress && ress.Prefix) prefix = ress.Prefix;

    if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
      const command = client.slashCommands.get(interaction.commandName);
      if (!command || !command.autocomplete) return;

      try {
        await command.autocomplete(interaction, client);
      } catch (error) {
        console.error(`Autocomplete error for ${interaction.commandName}:`, error);
        client.logger.log(`Autocomplete error for ${interaction.commandName}: ${error.stack}`, "error");
      }
      return;
    }

    if (interaction.type === InteractionType.ApplicationCommand) {
      if (!client.slashCommands) {
        client.logger.log("Slash commands collection is not initialized", "error");
        return;
      }

      const command = client.slashCommands.get(interaction.commandName);
      if (!command) return;

      if (command.botPerms) {
        if (
          !interaction.guild.members.me.permissions.has(
            PermissionsBitField.resolve(command.botPerms || []),
          )
        ) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(
              `**${client.emoji.warn} I don't have \`${command.botPerms}\` permission in ${interaction.channel.toString()} to execute this \`${command.name}\` command.**`
            );

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      if (command.userPerms) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.resolve(command.userPerms || []),
          )
        ) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(
              `**${client.emoji.warn} You don't have \`${command.userPerms}\` permission in ${interaction.channel.toString()} to execute this \`${command.name}\` command.**`
            );

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      const player = interaction.client.manager.players.get(
        interaction.guildId,
      );
      if (command.player && !player) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} There is no player for this guild.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied) {
          return await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
      }
      if (command.inVoiceChannel && !interaction.member.voice.channel) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} You must be in a voice channel.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied) {
          return await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
      }
      if (command.sameVoiceChannel) {
        if (!interaction.guild || !interaction.guild.members.me) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} An error occurred. It seems the bot is not properly connected to the guild.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }

        const botVoiceChannel = interaction.guild.members.me.voice.channel;
        const userVoiceChannel = interaction.member.voice.channel;

        if (botVoiceChannel) {
          if (userVoiceChannel !== botVoiceChannel) {
            const errorDisplay = new TextDisplayBuilder()
              .setContent(`**${client.emoji.warn} You must be in the same ${botVoiceChannel.toString()} to use this command.**`);

            const container = new ContainerBuilder()
              .addTextDisplayComponents(errorDisplay);

            return await interaction
              .reply({
                components: [container],
                flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
              })
              .catch(() => { });
          }
        }
      }

      try {
        const interactionWrapper = {
          guild: interaction.guild,
          channel: interaction.channel,
          author: interaction.user,
          member: interaction.member,
          createdTimestamp: interaction.createdTimestamp,
          mentions: {
            channels: new Map()
          },
          reply: async (options) => {
            if (interaction.deferred) {
              return await interaction.editReply(options);
            } else if (interaction.replied) {
              return await interaction.followUp(options);
            } else {
              return await interaction.reply(options);
            }
          },
        };

        const args = [];
        if (interaction.options) {
          const action = interaction.options.getString('action');
          const channel = interaction.options.getChannel('channel');
          const prefix = interaction.options.getString('prefix');
          const source = interaction.options.getString('source');
          const query = interaction.options.getString('query');
          const song = interaction.options.getString('song');
          const name = interaction.options.getString('name');
          const input = interaction.options.getString('input');
          const text = interaction.options.getString('text');
          const number = interaction.options.getInteger('number');
          const amount = interaction.options.getInteger('amount');
          const position = interaction.options.getInteger('position');

          if (action) args.push(action);
          if (channel) {
            args.push(channel.id);
            interactionWrapper.mentions.channels.set(channel.id, channel);
            interactionWrapper.mentions.channels.first = () => channel;
          }
          if (prefix) args.push(prefix);
          if (source) args.push(source);
          if (query) args.push(...query.split(' '));
          if (song) args.push(...song.split(' '));
          if (name) args.push(...name.split(' '));
          if (input) args.push(...input.split(' '));
          if (text) args.push(...text.split(' '));
          if (number !== null && number !== undefined) args.push(number.toString());
          if (amount !== null && amount !== undefined) args.push(amount.toString());
          if (position !== null && position !== undefined) args.push(position.toString());
        }

        if (command.slashExecute) {
          await command.slashExecute(interaction, client);
        } else if (command.execute) {
          await command.execute(interactionWrapper, args, client, prefix);
        } else if (command.run) {
          await command.run(client, interactionWrapper, prefix);
        }

        if (client.config.Webhooks?.cmdrun) {
          const { WebhookClient, EmbedBuilder } = require("discord.js");
          const web = new WebhookClient({ url: client.config.Webhooks.cmdrun });

          const getCommandString = () => {
            let cmdString = `/${interaction.commandName}`;
            if (interaction.options) {
              const subcommand = interaction.options.getSubcommand(false);
              if (subcommand) {
                cmdString += ` ${subcommand}`;
              }
              const options = interaction.options.data;
              if (options && options.length > 0) {
                const optionStrings = options
                  .filter(opt => opt.type !== 1)
                  .map(opt => `${opt.name}:${opt.value}`)
                  .join(' ');
                if (optionStrings) cmdString += ` ${optionStrings}`;
              }
            }
            return cmdString;
          };

          const commandlog = new EmbedBuilder()
            .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) })
            .setColor(client.color)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .setTimestamp()
            .setDescription(
              `**${client.emoji.dot} Command Used In:** \`${interaction.guild.name} | ${interaction.guild.id}\`\n` +
              `**${client.emoji.dot} Channel:** \`${interaction.channel.name} | ${interaction.channel.id}\`\n` +
              `**${client.emoji.dot} Command:** \`${command.name}\` (Slash)\n` +
              `**${client.emoji.dot} Executor:** \`${interaction.user.tag} | ${interaction.user.id}\`\n` +
              `**${client.emoji.dot} Content:** \`${getCommandString()}\``
            );

          web.send({ embeds: [commandlog] }).catch(console.error);
        }

      } catch (error) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.warn} An unexpected error occurred.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        if (interaction.replied) {
          await interaction
            .editReply({
              components: [container],
              flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        } else {
          await interaction
            .reply({
              components: [container],
              flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
            })
            .catch(() => { });
        }
        client.logger.log(`Interaction Error: ${error.stack}`, "error");
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'bioset_modal' || interaction.customId.startsWith('bio_')) {
        try {
          const command = require("../../commands/Profile/bioset");
          await command.modalHandler(interaction);
        } catch (error) {
          client.logger.log(`Error handling bioset modal submission: ${error.stack}`, "error");

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} There was an error processing your input. Please try again.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
          }).catch(() => { });
        }
      }
    }

    if (interaction.isButton()) {
      const customIdParts = interaction.customId.split('_');
      const potentialCommandName = customIdParts[0];

      let command = client.commands.get(potentialCommandName);

      if (!command) {
        const commandName = client.aliases.get(potentialCommandName);
        if (commandName) {
          command = client.commands.get(commandName);
        }
      }

      if (command && typeof command.componentsV2 === 'function') {
        try {
          await command.componentsV2(interaction, client);
          return;
        } catch (error) {
          client.logger.log(`Error executing componentsV2 for ${potentialCommandName}: ${error.stack}`, "error");

          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} An error occurred while processing this interaction.**`);

          const errorContainer = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          const errorMessage = {
            components: [errorContainer],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
          };

          if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage).catch(() => { });
          } else {
            await interaction.reply(errorMessage).catch(() => { });
          }
          return;
        }
      }

      // Handle Now Playing Buttons
      const player = client.manager.players.get(interaction.guildId);
      if (player && player.data.get("nowPlayingMessage")?.id === interaction.message.id) {
        if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== player.voiceId) {
          return interaction.reply({ content: `**${client.emoji.warn} You must be in my voice channel to use these buttons.**`, ephemeral: true });
        }

        const { updateNowPlayingButtons } = require("../Players/playerStart");

        switch (interaction.customId) {
          case "pause":
            const isPaused = !player.shoukaku.paused;
            await player.pause(isPaused);
            await updateNowPlayingButtons(client, player, isPaused);
            await interaction.reply({ 
              content: `**${client.emoji.check} Player ${isPaused ? "Paused" : "Resumed"}**`, 
              ephemeral: true 
            }).catch(() => { });
            break;

          case "skip":
            await player.skip();
            await interaction.reply({ 
              content: `**${client.emoji.check} Skipped current track**`, 
              ephemeral: true 
            }).catch(() => { });
            break;

          case "stop":
            player.queue.clear();
            await player.skip();
            await interaction.reply({ 
              content: `**${client.emoji.check} Player Stopped**`, 
              ephemeral: true 
            }).catch(() => { });
            break;

          case "loop":
            const modes = ["none", "track", "queue"];
            const currentModeIndex = modes.indexOf(player.loop || "none");
            const nextMode = modes[(currentModeIndex + 1) % modes.length];
            player.loop = nextMode;
            await updateNowPlayingButtons(client, player, player.shoukaku.paused);
            await interaction.reply({ 
              content: `**${client.emoji.check} Loop mode set to: \`${nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}\`**`, 
              ephemeral: true 
            }).catch(() => { });
            break;

          case "autoplay":
            const currentAuto = player.data.get("autoplay") || false;
            const newAutoStatus = !currentAuto;
            player.data.set("autoplay", newAutoStatus);
            await updateNowPlayingButtons(client, player, player.shoukaku.paused);
            await interaction.reply({ 
              content: `**${client.emoji.check} Autoplay has been \`${newAutoStatus ? "Enabled" : "Disabled"}\`**`, 
              ephemeral: true 
            }).catch(() => { });
            break;
        }
        return;
      }

      const data = await db3.findOne({ Guild: interaction.guildId });
      if (
        data &&
        interaction.channelId === data.Channel &&
        interaction.message.id === data.Message
      )
        return client.emit("playerButtons", interaction, data);
    }
  },
};