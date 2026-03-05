const {
  ContainerBuilder,
  TextDisplayBuilder,
  SectionBuilder,
  ThumbnailBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  PermissionsBitField
} = require("discord.js");
const UserPreferences = require("../../schema/userpreferences");

module.exports = {
  name: "play",
  category: "Music",
  aliases: ["p"],
  cooldown: 3,
  description: "Plays a song or playlist.",
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

  autocomplete: async (interaction, client) => {
    const focusedValue = interaction.options.getFocused();

    if (!focusedValue || focusedValue.length < 2) {
      return interaction.respond([]);
    }

    const isUrl = /^https?:\/\//.test(focusedValue) ||
      focusedValue.includes('youtube.com') ||
      focusedValue.includes('youtu.be') ||
      focusedValue.includes('spotify.com') ||
      focusedValue.includes('music.apple.com') ||
      focusedValue.includes('deezer.com') ||
      focusedValue.includes('jiosaavn.com');

    if (isUrl) {
      return interaction.respond([]);
    }

    try {
      let searchEngine = 'ytmsearch';
      try {
        const userPref = await UserPreferences.findOne({ userId: interaction.user.id });
        if (userPref?.musicSource) {
          searchEngine = userPref.musicSource;
        }
      } catch (error) {
        console.error("Error fetching user preference:", error);
      }

      const searchPromise = client.manager.search(focusedValue, {
        engine: searchEngine,
        requester: interaction.user
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ tracks: [] }), 2500);
      });

      const searchResult = await Promise.race([searchPromise, timeoutPromise]);

      const tracks = searchResult.tracks || [];

      if (tracks.length === 0) {
        return interaction.respond([]).catch(() => { });
      }

      const choices = tracks.slice(0, 25).map(track => {
        const title = (track.title || 'Unknown').substring(0, 80);
        const author = (track.author || 'Unknown').substring(0, 15);
        const rawValue = track.uri || track.identifier || `${searchEngine}:${track.title}`;

        return {
          name: `${title} - ${author}`,
          value: rawValue.length > 100 ? rawValue.substring(0, 100) : rawValue
        };
      });

      await interaction.respond(choices).catch(() => { });
    } catch (error) {
      console.error("Autocomplete error:", error);
      try {
        await interaction.respond([]).catch(() => { });
      } catch (e) { }
    }
  },

  async slashExecute(interaction, client) {
    const query = interaction.options.getString("song");

    await interaction.deferReply();

    if (!interaction.member?.voice?.channel) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} You need to be in a voice channel first.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const channel = interaction.member.voice.channel;

    if (!interaction.guild.members.me.permissions.has([
      PermissionsBitField.Flags.Connect,
      PermissionsBitField.Flags.Speak,
    ])) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} I don't have enough permissions! Please give me \`CONNECT\` and \`SPEAK\`.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return interaction.editReply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    try {
      const { waitForNodeConnection, hasAvailableNodes } = require("../../utils/nodeUtils");

      if (!hasAvailableNodes(client.manager)) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} The music server is currently unavailable. Please try again later.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }


      let player = client.manager.players.get(interaction.guild.id);

      if (!player) {
        try {
          player = await client.manager.createPlayer({
            guildId: interaction.guild.id,
            voiceId: channel.id,
            textId: interaction.channel.id,
            volume: 80,
            deaf: true,
          });

          try {
            client.voiceHealthMonitor?.startMonitoring(player);
          } catch {}
        } catch (createError) {
          console.error("Player creation error:", createError);

          if (createError.status === 404 && createError.message && createError.message.includes('Session not found')) {
            console.log(`Stale session detected for guild ${interaction.guild.id}, cleaning up and retrying...`);

            if (client.manager.players.has(interaction.guild.id)) {
              client.manager.players.delete(interaction.guild.id);
            }

            try {
              await new Promise(resolve => setTimeout(resolve, 500));

              player = await client.manager.createPlayer({
                guildId: interaction.guild.id,
                voiceId: channel.id,
                textId: interaction.channel.id,
                volume: 80,
                deaf: true,
              });

              console.log(`Successfully recreated player for guild ${interaction.guild.id}`);
              try {
                client.voiceHealthMonitor?.startMonitoring(player);
              } catch {}
            } catch (retryError) {
              console.error("Player creation retry error:", retryError);
              throw new Error(`Voice connection failed after retry: ${retryError.message}`);
            }
          } else {
            throw new Error(`Voice connection failed: ${createError.message}`);
          }
        }
      } else {
        if (player.voiceId !== channel.id) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} I'm already connected to a different voice channel.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (player.textId !== interaction.channel.id) {
          player.textId = interaction.channel.id;
        }
      }

      const isUrl = /^https?:\/\//.test(query) ||
        query.includes("youtube.com") ||
        query.includes("youtu.be") ||
        query.includes("music.apple.com") ||
        query.includes("spotify.com") ||
        query.includes("deezer.com") ||
        query.includes("jiosaavn.com");

      let searchResult;
      try {
        searchResult = await player.search(query, {
          requester: interaction.user,
          engine: isUrl ? undefined : 'ytmsearch'
        });
      } catch (searchError) {
        const { handleSessionError, recreatePlayer } = require("../../utils/playerUtils");

        if (await handleSessionError(searchError, player, client)) {
          try {
            player = await recreatePlayer(client, interaction.guild.id, channel.id, interaction.channel.id);
            searchResult = await player.search(query, {
              requester: interaction.user,
              engine: isUrl ? undefined : 'ytmsearch'
            });
          } catch (retryError) {
            console.error("Search retry error:", retryError);
            searchResult = { tracks: [] };
          }
        } else {
          console.error("Search error:", searchError);
          searchResult = { tracks: [] };
        }
      }

      if (!searchResult.tracks.length) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} No results found for "${query}"**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const currentQueueSize = player.queue.size;
      const isPlaying = player.playing || player.paused;

      if (searchResult.type === "PLAYLIST") {
        for (const track of searchResult.tracks) {
          player.queue.add(track);
        }

        try {
          if (!player.playing && !player.paused) {
            await player.play();
          }
        } catch (playError) {
          const { handleSessionError, recreatePlayer } = require("../../utils/playerUtils");

          if (await handleSessionError(playError, player, client)) {
            try {
              player = await recreatePlayer(client, interaction.guild.id, channel.id, interaction.channel.id);
              for (const track of searchResult.tracks) {
                player.queue.add(track);
              }
              await player.play();
            } catch (retryError) {
              console.error("Play retry error:", retryError);
              throw retryError;
            }
          } else {
            throw playError;
          }
        }

        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Queued \`${searchResult.tracks.length}\` tracks from \`${searchResult.playlistName}\`**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        return interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }

      const track = searchResult.tracks[0];
      const position = currentQueueSize + (isPlaying ? 1 : 0);
      player.queue.add(track);

      try {
        if (!player.playing && !player.paused) {
          await player.play();
        }
      } catch (playError) {
        const { handleSessionError, recreatePlayer } = require("../../utils/playerUtils");

        if (await handleSessionError(playError, player, client)) {
          try {
            player = await recreatePlayer(client, interaction.guild.id, channel.id, interaction.channel.id);
            player.queue.add(track);
            await player.play();
          } catch (retryError) {
            console.error("Play retry error:", retryError);
            throw retryError;
          }
        } else {
          throw playError;
        }
      }

      const { convertTime } = require("../../utils/convert.js");

      const cleanAuthorName = (author) => {
        if (!author) return 'Unknown Artist';
        return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
      };

      const truncateTitle = (title, maxLength = 20) => {
        if (!title) return 'Unknown Title';
        if (title.length <= maxLength) return title;
        return title.substring(0, maxLength) + '...';
      };

      const getCleanThumbnail = (thumbnailUrl) => {
        if (!thumbnailUrl) return null;

        if (thumbnailUrl.includes('i.ytimg.com') || thumbnailUrl.includes('img.youtube.com')) {
          const videoIdMatch = thumbnailUrl.match(/vi\/([^\/]+)\//);
          if (videoIdMatch && videoIdMatch[1]) {
            return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
          }
        }

        return thumbnailUrl;
      };

      const titleDisplay = new TextDisplayBuilder()
        .setContent(`### Enqueued [${truncateTitle(track.title)}](${track.uri})`);

      const infoDisplay = new TextDisplayBuilder()
        .setContent(
          `> - **Author:** [${cleanAuthorName(track.author)}](${track.uri})\n` +
          `> - **Duration:** \`${convertTime(track.length)}\`\n` +
          `> - **Requester:** [${interaction.user.username}](https://discord.com/users/${interaction.user.id})\n` +
          `> - **Position:** \`${position}\``
        );

      const section = new SectionBuilder()
        .addTextDisplayComponents(titleDisplay, infoDisplay);

      if (track.thumbnail || track.artworkUrl) {
        const cleanThumbnail = getCleanThumbnail(track.thumbnail || track.artworkUrl);
        if (cleanThumbnail) {
          section.setThumbnailAccessory((thumbnail) =>
            thumbnail.setURL(cleanThumbnail)
          );
        }
      }

      const container = new ContainerBuilder()
        .addSectionComponents(section);

      if (position > 0) {
        const removeButton = new ButtonBuilder()
          .setCustomId(`remove_${track.identifier}_${position}`)
          .setLabel('Remove')
          .setStyle(ButtonStyle.Danger);

        const playNextButton = new ButtonBuilder()
          .setCustomId(`playnext_${track.identifier}_${position}`)
          .setLabel('Play Next')
          .setStyle(ButtonStyle.Success)
          .setDisabled(position === 1);

        const buttonRow = new ActionRowBuilder()
          .addComponents(removeButton, playNextButton);

        container.addSeparatorComponents(new SeparatorBuilder());
        container.addActionRowComponents(buttonRow);
      }

      let replyMsg;
      try {
        replyMsg = await interaction.editReply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (editError) {
        if (editError.code === 50027 || editError.message?.includes('Invalid Webhook Token')) {
          try {
            const channel = client.channels.cache.get(interaction.channel.id);
            if (channel) {
              replyMsg = await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              });
            }
          } catch (sendError) {
            console.error('Failed to send message after token expiry:', sendError);
            return;
          }
        } else {
          throw editError;
        }
      }

      if (position > 0 && replyMsg) {
        const collector = replyMsg.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 300000
        });

        collector.on('collect', async (buttonInteraction) => {
          if (!buttonInteraction.member.voice.channel || buttonInteraction.member.voice.channel.id !== player.voiceId) {
            return buttonInteraction.reply({ content: `**${client.emoji.warn} You must be in my voice channel to use this.**`, ephemeral: true });
          }

          const parts = buttonInteraction.customId.split('_');
          const action = parts[0];
          const pos = parseInt(parts.pop());
          const identifier = parts.slice(1).join('_');

          if (action === 'remove') {
            try {
              let trackIndex = -1;
              if (player && player.queue) {
                trackIndex = player.queue.findIndex(t => t.identifier === identifier);
              }

              if (trackIndex !== -1) {
                const removedTrack = player.queue[trackIndex];
                player.queue.splice(trackIndex, 1);

                const updatedDisplay = new TextDisplayBuilder()
                  .setContent(`**${client.emoji.check} Removed [${removedTrack.title}](${removedTrack.uri}) from queue.**`);

                const updatedContainer = new ContainerBuilder()
                  .addTextDisplayComponents(updatedDisplay);

                await buttonInteraction.deferUpdate().catch(() => { });

                await buttonInteraction.message.edit({
                  components: [updatedContainer],
                  flags: MessageFlags.IsComponentsV2
                }).catch(() => { });

                buttonInteraction.message.actionTaken = true;
              } else {
                await buttonInteraction.reply({ content: `**${client.emoji.cross} This track is no longer in the queue.**`, ephemeral: true });
              }
            } catch (err) {
              console.error('Error removing track:', err);
            }
          } else if (action === 'playnext') {
            try {
              let trackIndex = -1;
              if (player && player.queue) {
                trackIndex = player.queue.findIndex(t => t.identifier === identifier);
              }

              if (trackIndex !== -1) {
                const trackToMove = player.queue[trackIndex];
                player.queue.splice(trackIndex, 1);
                player.queue.unshift(trackToMove);

                const updatedDisplay = new TextDisplayBuilder()
                  .setContent(`**${client.emoji.check} Moved [${trackToMove.title}](${trackToMove.uri}) to next in queue.**`);

                const updatedContainer = new ContainerBuilder()
                  .addTextDisplayComponents(updatedDisplay);

                await buttonInteraction.deferUpdate().catch(() => { });

                await buttonInteraction.message.edit({
                  components: [updatedContainer],
                  flags: MessageFlags.IsComponentsV2
                }).catch(() => { });

                buttonInteraction.message.actionTaken = true;
              } else {
                await buttonInteraction.reply({ content: `**${client.emoji.cross} This track is no longer in the queue.**`, ephemeral: true });
              }
            } catch (err) {
              console.error('Error moving track:', err);
            }
          }
        });

        collector.on('end', () => {
          if (replyMsg && !replyMsg.deleted && !replyMsg.actionTaken) {
            const finalTitleDisplay = new TextDisplayBuilder()
              .setContent(`### Enqueued [${truncateTitle(track.title)}](${track.uri})`);

            const finalInfoDisplay = new TextDisplayBuilder()
              .setContent(
                `> - **Author:** [${cleanAuthorName(track.author)}](${track.uri})\n` +
                `> - **Duration:** \`${convertTime(track.length)}\`\n` +
                `> - **Requester:** [${interaction.user.username}](https://discord.com/users/${interaction.user.id})\n` +
                `> - **Position:** \`${position}\``
              );

            const finalSection = new SectionBuilder()
              .addTextDisplayComponents(finalTitleDisplay, finalInfoDisplay);

            if (track.thumbnail || track.artworkUrl) {
              const cleanThumbnail = getCleanThumbnail(track.thumbnail || track.artworkUrl);
              if (cleanThumbnail) {
                finalSection.setThumbnailAccessory((thumbnail) =>
                  thumbnail.setURL(cleanThumbnail)
                );
              }
            }

            const finalContainer = new ContainerBuilder()
              .addSectionComponents(finalSection);

            replyMsg.edit({
              components: [finalContainer],
              flags: MessageFlags.IsComponentsV2
            }).catch(() => { });
          }
        });
      }

    } catch (error) {
      console.error("Error in slash play command:", error);

      let errorMessage = error.message;
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message.includes('fetch failed')) {
        errorMessage = "The music server is currently unreachable. Please try again or contact support.";
      } else {
        errorMessage = `An error occurred: ${error.message}`;
      }

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} ${errorMessage}**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      try {
        if (!interaction.deferred && !interaction.replied) {
          await interaction.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } catch (replyError) {
        if (replyError.code === 50027 || replyError.message?.includes('Invalid Webhook Token')) {
          try {
            const channel = client.channels.cache.get(interaction.channel.id);
            if (channel) {
              await channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              });
            }
          } catch (channelError) {
            console.error('Failed to send error message to channel:', channelError);
          }
        }
      }
    }
  },

  async execute(message, args, client, prefix) {
    let query = args.join(" ");
    let searchOptions = {};

    if (query) {
      const isUrl = /^https?:\/\//.test(query) ||
        query.includes("youtube.com") ||
        query.includes("youtu.be") ||
        query.includes("music.apple.com") ||
        query.includes("spotify.com") ||
        query.includes("deezer.com") ||
        query.includes("jiosaavn.com");

      if (isUrl) {
        searchOptions.engine = undefined;
      } else {
        try {
          const userPref = await UserPreferences.findOne({ userId: message.author.id });
          if (userPref && userPref.musicSource) {
            searchOptions.engine = userPref.musicSource;
          } else {
            searchOptions.engine = 'ytmsearch';
          }
        } catch (error) {
          console.error("Error fetching user preference:", error);
          searchOptions.engine = 'ytmsearch';
        }
      }
    }

    if (!query) {
      const usageDisplay = new TextDisplayBuilder()
        .setContent(
          `**${client.emoji.dot} Usage** \`:\` \`${prefix}play [Song Name/URL]\`\n` +
          `**${client.emoji.dot} Example** \`:\` \`${prefix}play imagine dragons believer\``
        );

      const container = new ContainerBuilder()
        .addTextDisplayComponents(usageDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    const channel = message.member.voice.channel;
    if (!channel) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} You need to be in a voice channel first.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.reply({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    if (
      !message.guild.members.me.permissions.has([
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.Speak,
      ])
    ) {
      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.warn} I don't have enough permissions! Please give me \`CONNECT\` and \`SPEAK\`.**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      return message.channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
      });
    }

    let player;

    try {
      const { waitForNodeConnection, hasAvailableNodes } = require("../../utils/nodeUtils");

      if (!hasAvailableNodes(client.manager)) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} The music server is currently unavailable. Please try again later.**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        return message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      }


      player = client.manager.players.get(message.guild.id);

      if (!player) {
        try {
          // Wait 1s for voice state to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));

          player = await client.manager.createPlayer({
            guildId: message.guild.id,
            voiceId: channel.id,
            textId: message.channel.id,
            volume: 80,
            deaf: true,
          });

          try {
            client.voiceHealthMonitor?.startMonitoring(player);
          } catch {}
        } catch (createError) {
          console.error("Player creation error:", createError);
          // NEW Debug info for 400 errors
          if (createError.status === 400) {
            console.error("[400 DEBUG] Bad Request Details:", JSON.stringify(createError, null, 2));
            if (createError.path) console.error("[400 DEBUG] Target Path:", createError.path);
          }

          if (createError.status === 404 && createError.message && createError.message.includes('Session not found')) {
            console.log(`Stale session detected for guild ${message.guild.id}, cleaning up and retrying...`);

            if (client.manager.players.has(message.guild.id)) {
              client.manager.players.delete(message.guild.id);
            }

            try {
              await new Promise(resolve => setTimeout(resolve, 500));

              player = await client.manager.createPlayer({
                guildId: message.guild.id,
                voiceId: channel.id,
                textId: message.channel.id,
                volume: 80,
                deaf: true,
              });

              console.log(`Successfully recreated player for guild ${message.guild.id}`);
              try {
                client.voiceHealthMonitor?.startMonitoring(player);
              } catch {}
            } catch (retryError) {
              console.error("Player creation retry error:", retryError);
              throw new Error(`Voice connection failed after retry: ${retryError.message || 'Unknown Error'}`);
            }
          } else {
            const partialPlayer = client.manager.players.get(message.guild.id);
            if (partialPlayer) {
              try {
                await partialPlayer.destroy();
              } catch (e) {
                console.error("Failed to destroy partial player:", e);
                if (client.manager.players.has(message.guild.id)) {
                  client.manager.players.delete(message.guild.id);
                }
              }
            }

            throw new Error(`Voice connection failed: ${createError.message || createError.status || 'Unknown error'}`);
          }
        }
      } else {
        if (player.voiceId !== channel.id) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.warn} I'm already connected to a different voice channel.**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          return message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (player.textId !== message.channel.id) {
          player.textId = message.channel.id;
        }
      }

      const currentQueueSize = player.queue.size;
      const isPlaying = player.playing || player.paused;
      let addedTracks = [];
      let trackCounter = 0;

      let searchResult = null;
      if (query) {
        if (searchOptions.engine === 'smart_selection') {
          searchResult = await performSmartSelection(query, message.author, client);
        } else {
          const searchOpts = { requester: message.author };
          if (searchOptions.engine) {
            searchOpts.engine = searchOptions.engine;
          }

          try {
            searchResult = await player.search(query, searchOpts);
          } catch (searchError) {
            console.error("Initial search error:", searchError);
            if (searchOptions.engine && searchOptions.engine !== 'ytsearch') {
              try {
                searchResult = await player.search(query, {
                  requester: message.author,
                  engine: 'ytsearch'
                });

                if (searchResult.tracks.length > 0) {
                  const infoDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.info} Your preferred source encountered an error, searching YouTube instead...**`);

                  const container = new ContainerBuilder()
                    .addTextDisplayComponents(infoDisplay);

                  await message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                  });
                }
              } catch (fallbackError) {
                console.error("Fallback search error:", fallbackError);
                searchResult = { tracks: [] };
              }
            } else {
              searchResult = { tracks: [] };
            }
          }
        }

        if (!searchResult.tracks.length && searchOptions.engine && searchOptions.engine !== 'ytsearch' && searchOptions.engine !== 'smart_selection') {
          try {
            const fallbackResult = await player.search(query, {
              requester: message.author,
              engine: 'ytsearch'
            });

            if (fallbackResult.tracks.length > 0) {
              searchResult = fallbackResult;

              const infoDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} No results found with your preferred source, searching YouTube instead...**`);

              const container = new ContainerBuilder()
                .addTextDisplayComponents(infoDisplay);

              await message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
              });
            }
          } catch (fallbackError) {
            console.error("Fallback search error:", fallbackError);
          }
        }

        if (!searchResult.tracks.length) {
          const errorDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.cross} No result was found**`);

          const container = new ContainerBuilder()
            .addTextDisplayComponents(errorDisplay);

          try {
            return await message.reply({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          } catch (e) {
            return await message.channel.send({
              components: [container],
              flags: MessageFlags.IsComponentsV2
            });
          }
        }

        if (searchResult.type === "PLAYLIST") {
          for (let i = 0; i < searchResult.tracks.length; i++) {
            const position = currentQueueSize + trackCounter + (isPlaying ? 1 : 0);
            player.queue.add(searchResult.tracks[i]);
            addedTracks.push({ track: searchResult.tracks[i], position });
            trackCounter++;
          }
        } else {
          const position = currentQueueSize + trackCounter + (isPlaying ? 1 : 0);
          player.queue.add(searchResult.tracks[0]);
          addedTracks.push({ track: searchResult.tracks[0], position });
          trackCounter++;
        }
      }

      if (addedTracks.length === 0) {
        const errorDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.cross} No tracks could be processed**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(errorDisplay);

        try {
          return await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (e) {
          return await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      }

      if (player && !player.playing && !player.paused) {
        const lastActivity = player.data?.get('lastActivityTime') || player.data?.get('monitorStartTime');
        const idleDuration = lastActivity ? Date.now() - lastActivity : 0;

        if (idleDuration > 5 * 60 * 1000) {
          try {
            const { getVoiceConnection } = require('@discordjs/voice');
            const connection = getVoiceConnection(message.guild.id);

            if (connection) {
              connection.rejoin({
                channelId: channel.id,
                selfDeaf: true,
                selfMute: false,
              });

              client.logger?.log(
                `[Play] Refreshed stale voice connection for guild ${message.guild.id}`,
                'info'
              );
            }
          } catch (refreshError) {
            console.error('Failed to refresh connection:', refreshError);
          }
        }
      }

      if (!player.playing && !player.paused) {
        await player.play();
      }

      if (searchResult.type === "PLAYLIST") {
        const successDisplay = new TextDisplayBuilder()
          .setContent(`**${client.emoji.check} Queued \`${addedTracks.length}\` tracks from \`${searchResult.playlistName}\`**`);

        const container = new ContainerBuilder()
          .addTextDisplayComponents(successDisplay);

        try {
          await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (e) {
          await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } else {
        const track = addedTracks[0];
        const { convertTime } = require("../../utils/convert.js");

        const cleanAuthorName = (author) => {
          if (!author) return 'Unknown Artist';
          return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
        };

        const truncateTitle = (title, maxLength = 20) => {
          if (!title) return 'Unknown Title';
          if (title.length <= maxLength) return title;
          return title.substring(0, maxLength) + '...';
        };

        const getCleanThumbnail = (thumbnailUrl) => {
          if (!thumbnailUrl) return null;

          if (thumbnailUrl.includes('i.ytimg.com') || thumbnailUrl.includes('img.youtube.com')) {
            const videoIdMatch = thumbnailUrl.match(/vi\/([^\/]+)\//);
            if (videoIdMatch && videoIdMatch[1]) {
              return `https://i.ytimg.com/vi/${videoIdMatch[1]}/maxresdefault.jpg`;
            }
          }

          return thumbnailUrl;
        };

        const titleDisplay = new TextDisplayBuilder()
          .setContent(`### Enqueued [${truncateTitle(track.track.title)}](${track.track.uri})`);

        const infoDisplay = new TextDisplayBuilder()
          .setContent(
            `> - **Author:** [${cleanAuthorName(track.track.author)}](${track.track.uri})\n` +
            `> - **Duration:** \`${convertTime(track.track.length)}\`\n` +
            `> - **Requester:** [${message.author.username}](https://discord.com/users/${message.author.id})\n` +
            `> - **Position:** \`${track.position}\``
          );

        const section = new SectionBuilder()
          .addTextDisplayComponents(titleDisplay, infoDisplay);

        if (track.track.thumbnail || track.track.artworkUrl) {
          const cleanThumbnail = getCleanThumbnail(track.track.thumbnail || track.track.artworkUrl);
          if (cleanThumbnail) {
            section.setThumbnailAccessory((thumbnail) =>
              thumbnail.setURL(cleanThumbnail)
            );
          }
        }

        const container = new ContainerBuilder()
          .addSectionComponents(section);

        if (track.position > 0) {
          const removeButton = new ButtonBuilder()
            .setCustomId(`remove_${track.track.identifier}_${track.position}`)
            .setLabel('Remove')
            .setStyle(ButtonStyle.Danger);

          const playNextButton = new ButtonBuilder()
            .setCustomId(`playnext_${track.track.identifier}_${track.position}`)
            .setLabel('Play Next')
            .setStyle(ButtonStyle.Success)
            .setDisabled(track.position === 1);

          const buttonRow = new ActionRowBuilder()
            .addComponents(removeButton, playNextButton);

          container.addSeparatorComponents(new SeparatorBuilder());
          container.addActionRowComponents(buttonRow);
        }

        let replyMsg;
        try {
          replyMsg = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (e) {
          replyMsg = await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        }

        if (track.position > 0 && replyMsg) {
          const collector = replyMsg.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 300000
          });

          collector.on('collect', async (interaction) => {
            if (!interaction.member.voice.channel || interaction.member.voice.channel.id !== player.voiceId) {
              return interaction.reply({ content: `**${client.emoji.warn} You must be in my voice channel to use this.**`, ephemeral: true });
            }

            const parts = interaction.customId.split('_');
            const action = parts[0];
            const pos = parseInt(parts.pop());
            const identifier = parts.slice(1).join('_');

            if (action === 'remove') {
              try {
                let trackIndex = -1;
                if (player && player.queue) {
                  trackIndex = player.queue.findIndex(t => t.identifier === identifier);
                }

                if (trackIndex !== -1) {
                  const removedTrack = player.queue[trackIndex];
                  player.queue.splice(trackIndex, 1);

                  const updatedDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Removed [${removedTrack.title}](${removedTrack.uri}) from queue.**`);

                  const updatedContainer = new ContainerBuilder()
                    .addTextDisplayComponents(updatedDisplay);

                  await interaction.deferUpdate().catch(() => { });

                  await interaction.message.edit({
                    components: [updatedContainer],
                    flags: MessageFlags.IsComponentsV2
                  }).catch(() => { });

                  interaction.message.actionTaken = true;
                } else {
                  await interaction.reply({ content: `**${client.emoji.cross} This track is no longer in the queue.**`, ephemeral: true });
                }
              } catch (err) {
                console.error('Error removing track:', err);
              }
            } else if (action === 'playnext') {
              try {
                let trackIndex = -1;
                if (player && player.queue) {
                  trackIndex = player.queue.findIndex(t => t.identifier === identifier);
                }

                if (trackIndex !== -1) {
                  const trackToMove = player.queue[trackIndex];
                  player.queue.splice(trackIndex, 1);
                  player.queue.unshift(trackToMove);

                  const updatedDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Moved [${trackToMove.title}](${trackToMove.uri}) to next in queue.**`);

                  const updatedContainer = new ContainerBuilder()
                    .addTextDisplayComponents(updatedDisplay);

                  await interaction.deferUpdate().catch(() => { });

                  await interaction.message.edit({
                    components: [updatedContainer],
                    flags: MessageFlags.IsComponentsV2
                  }).catch(() => { });

                  interaction.message.actionTaken = true;
                } else {
                  await interaction.reply({ content: `**${client.emoji.cross} This track is no longer in the queue.**`, ephemeral: true });
                }
              } catch (err) {
                console.error('Error moving track:', err);
              }
            }
          });

          collector.on('end', () => {
            if (replyMsg && !replyMsg.deleted && !replyMsg.actionTaken) {
              const finalTitleDisplay = new TextDisplayBuilder()
                .setContent(`### Enqueued [${truncateTitle(track.track.title)}](${track.track.uri})`);

              const finalInfoDisplay = new TextDisplayBuilder()
                .setContent(
                  `> - **Author:** [${cleanAuthorName(track.track.author)}](${track.track.uri})\n` +
                  `> - **Duration:** \`${convertTime(track.track.length)}\`\n` +
                  `> - **Requester:** [${message.author.username}](https://discord.com/users/${message.author.id})\n` +
                  `> - **Position:** \`${track.position}\``
                );

              const finalSection = new SectionBuilder()
                .addTextDisplayComponents(finalTitleDisplay, finalInfoDisplay);

              if (track.track.thumbnail || track.track.artworkUrl) {
                const cleanThumbnail = getCleanThumbnail(track.track.thumbnail || track.track.artworkUrl);
                if (cleanThumbnail) {
                  finalSection.setThumbnailAccessory((thumbnail) =>
                    thumbnail.setURL(cleanThumbnail)
                  );
                }
              }

              const finalContainer = new ContainerBuilder()
                .addSectionComponents(finalSection);

              replyMsg.edit({
                components: [finalContainer],
                flags: MessageFlags.IsComponentsV2
              }).catch(() => { });
            }
          });
        }
      }
    } catch (error) {
      console.error("Error in play command:", error);

      let errorMessage = error.message;
      if (error.code === 'UND_ERR_CONNECT_TIMEOUT' || error.message.includes('fetch failed')) {
        errorMessage = "The music server is currently unreachable. Please try again or contact support.";
      } else {
        errorMessage = `An error occurred while playing: ${error.message}`;
      }

      const errorDisplay = new TextDisplayBuilder()
        .setContent(`**${client.emoji.cross} ${errorMessage}**`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(errorDisplay);

      try {
        await message.reply({
          components: [container],
          flags: MessageFlags.IsComponentsV2
        });
      } catch (replyError) {
        try {
          await message.channel.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
          });
        } catch (sendError) {
          console.error("Failed to send error message:", sendError);
        }
      }

      if (player) {
        try {
          await player.destroy();
        } catch (destroyError) {
          console.error("Failed to destroy player:", destroyError);
          if (client.manager.players.has(message.guild.id)) {
            client.manager.players.delete(message.guild.id);
          }
        }
      }
    }
  },
};

async function performSmartSelection(query, requester, client) {
  const allSources = [
    { engine: 'ytsearch', name: 'YouTube', emoji: client.emoji.youtube },
    { engine: 'ytmsearch', name: 'YouTube Music', emoji: client.emoji.ytmusic },
    { engine: 'spsearch', name: 'Spotify', emoji: client.emoji.spotify },
    { engine: 'amsearch', name: 'Apple Music', emoji: client.emoji.applemusic },
    { engine: 'dzsearch', name: 'Deezer', emoji: client.emoji.deezer },
    { engine: 'jssearch', name: 'JioSaavn', emoji: client.emoji.jiosaavn }
  ];

  const shuffledSources = allSources.sort(() => Math.random() - 0.5);

  const searchPromises = shuffledSources.map(async (source) => {
    try {
      const node = [...client.manager.shoukaku.nodes.values()][0];
      if (!node) return { source, tracks: [] };

      const searchQuery = `${source.engine}:${query}`;
      const res = await node.rest.resolve(searchQuery);

      if (res && res.loadType === 'search' && res.data && res.data.length > 0) {
        const { KazagumoTrack } = require('kazagumo');
        const tracks = res.data.map(track => {
          const kazagumoTrack = new KazagumoTrack(track, requester);
          kazagumoTrack.sourceInfo = source;
          return kazagumoTrack;
        });
        return { source, tracks: tracks.slice(0, 3) };
      }
      return { source, tracks: [] };
    } catch (error) {
      console.error(`Error searching ${source.name}:`, error);
      return { source, tracks: [] };
    }
  });

  const searchResultsBySource = await Promise.allSettled(searchPromises);

  let allTracks = [];
  for (const result of searchResultsBySource) {
    if (result.status === 'fulfilled' && result.value.tracks.length > 0) {
      allTracks = allTracks.concat(result.value.tracks);
    }
  }

  if (allTracks.length === 0) {
    return { type: "SEARCH", tracks: [] };
  }

  const scoredTracks = allTracks.map(track => {
    const similarity = calculateSimilarity(query.toLowerCase(), track.title.toLowerCase());
    return { track, similarity };
  });

  scoredTracks.sort((a, b) => b.similarity - a.similarity);

  const topMatches = scoredTracks.slice(0, 5);
  const selectedMatch = topMatches[Math.floor(Math.random() * topMatches.length)];

  console.log(`Smart selection chose ${selectedMatch.track.sourceInfo.name} for "${query}"`);

  return {
    type: "TRACK",
    tracks: [selectedMatch.track],
    selectedSource: selectedMatch.track.sourceInfo
  };
}

function calculateSimilarity(query, title) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const titleWords = title.toLowerCase().split(/\s+/);

  let matchCount = 0;
  for (const queryWord of queryWords) {
    for (const titleWord of titleWords) {
      if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) {
        matchCount++;
        break;
      }
    }
  }

  return matchCount / queryWords.length;
}

function cleanAuthorName(author) {
  if (!author) return 'Unknown';

  return author.replace(/\s*-\s*Topic\s*$/i, '').trim();
}
