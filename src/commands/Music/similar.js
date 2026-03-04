const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder
} = require("discord.js");

module.exports = {
    name: "similar",
    category: "Music",
    aliases: ["sim", "related"],
    cooldown: 15,
    description: "Get songs similar to currently playing track",
    args: false,
    usage: "",
    userPerms: [],
    botPerms: [],
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [],

    async slashExecute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} No Track Playing**`);

            const separator = new SeparatorBuilder();

            const infoDisplay = new TextDisplayBuilder()
                .setContent(`There is no track currently playing to find similar songs for.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(infoDisplay);

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const loadingDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.load} Searching Similar Songs**`);

        const loadingSeparator = new SeparatorBuilder();

        const loadingInfo = new TextDisplayBuilder()
            .setContent(`Please wait while I search for similar tracks across all music platforms...`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingDisplay)
            .addSeparatorComponents(loadingSeparator)
            .addTextDisplayComponents(loadingInfo);

        await interaction.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2,
        });

        const currentTrack = player.queue.current;
        const searchQuery = `${currentTrack.title} ${currentTrack.author}`;

        const results = {
            youtube: [],
            ytmusic: [],
            spotify: [],
            applemusic: [],
            deezer: [],
            jiosaavn: []
        };

        const searchPromises = [
            searchPlatform(player, 'ytsearch', searchQuery, interaction.user).then(tracks => results.youtube = tracks),
            searchPlatform(player, 'ytmsearch', searchQuery, interaction.user).then(tracks => results.ytmusic = tracks),
            searchPlatform(player, 'spsearch', searchQuery, interaction.user).then(tracks => results.spotify = tracks),
            searchPlatform(player, 'amsearch', searchQuery, interaction.user).then(tracks => results.applemusic = tracks),
            searchPlatform(player, 'dzsearch', searchQuery, interaction.user).then(tracks => results.deezer = tracks),
            searchPlatform(player, 'jssearch', searchQuery, interaction.user).then(tracks => results.jiosaavn = tracks),
        ];

        await Promise.allSettled(searchPromises);

        const totalResults = Object.values(results).reduce((total, tracks) => total + tracks.length, 0);

        if (totalResults === 0) {
            const noResultsDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} No Similar Songs Found**`);

            const noResultsSeparator = new SeparatorBuilder();

            const noResultsInfo = new TextDisplayBuilder()
                .setContent(`No similar tracks found for "${currentTrack.title}" across any platform.`);

            const noResultsContainer = new ContainerBuilder()
                .addTextDisplayComponents(noResultsDisplay)
                .addSeparatorComponents(noResultsSeparator)
                .addTextDisplayComponents(noResultsInfo);

            return interaction.editReply({
                components: [noResultsContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const sourceOptions = [
            {
                label: 'YouTube',
                value: 'youtube',
                description: `${results.youtube.length} tracks found`,
                emoji: client.emoji.youtube,
            },
            {
                label: 'YouTube Music',
                value: 'ytmusic',
                description: `${results.ytmusic.length} tracks found`,
                emoji: client.emoji.ytmusic,
            },
            {
                label: 'Spotify',
                value: 'spotify',
                description: `${results.spotify.length} tracks found`,
                emoji: client.emoji.spotify,
            },
            {
                label: 'Apple Music',
                value: 'applemusic',
                description: `${results.applemusic.length} tracks found`,
                emoji: client.emoji.applemusic,
            },
            {
                label: 'Deezer',
                value: 'deezer',
                description: `${results.deezer.length} tracks found`,
                emoji: client.emoji.deezer,
            },
            {
                label: 'JioSaavn',
                value: 'jiosaavn',
                description: `${results.jiosaavn.length} tracks found`,
                emoji: client.emoji.jiosaavn,
            },
        ].filter(option => results[option.value].length > 0);

        let currentSource = sourceOptions[0].value;

        const createSongOptions = (source) => {
            const tracks = results[source].slice(0, 25);
            return tracks.map((track, index) => ({
                label: `${index + 1}. ${track.title.substring(0, 90)}`,
                value: `${source}-${index}`,
                description: `${track.author.substring(0, 90)} | ${formatDuration(track.length)}`,
            }));
        };

        const sourceMenu = new StringSelectMenuBuilder()
            .setCustomId('similar_source')
            .setPlaceholder('Select a music source')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(sourceOptions);

        const songMenu = new StringSelectMenuBuilder()
            .setCustomId('similar_songs')
            .setPlaceholder('Select tracks to add to queue')
            .setMinValues(1)
            .setMaxValues(Math.min(results[currentSource].length, 25))
            .addOptions(createSongOptions(currentSource));

        const mainDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.info} Similar Songs Results**`);

        const separator1 = new SeparatorBuilder();

        const instructionDisplay = new TextDisplayBuilder()
            .setContent(
                `**${client.emoji.dot} Current Track:** \`${currentTrack.title}\`\n` +
                `**${client.emoji.dot} Artist:** \`${currentTrack.author}\`\n` +
                `**${client.emoji.dot} Current Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\` (\`${results[currentSource].length}\` tracks)\n` +
                `**${client.emoji.dot} Total Results:** \`${totalResults}\` tracks across \`${sourceOptions.length}\` platforms`
            );

        const separator2 = new SeparatorBuilder();

        const helpDisplay = new TextDisplayBuilder()
            .setContent(`Select a music source from the first dropdown, then choose similar tracks from the second dropdown.`);

        const sourceRow = new ActionRowBuilder().addComponents(sourceMenu);
        const songRow = new ActionRowBuilder().addComponents(songMenu);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(mainDisplay)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(instructionDisplay)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(helpDisplay)
            .addActionRowComponents(sourceRow)
            .addActionRowComponents(songRow);

        const reply = await interaction.editReply({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 120000,
            idle: 60000
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'similar_source') {
                await i.deferUpdate();

                currentSource = i.values[0];

                const updatedSongMenu = new StringSelectMenuBuilder()
                    .setCustomId('similar_songs')
                    .setPlaceholder('Select tracks to add to queue')
                    .setMinValues(1)
                    .setMaxValues(Math.min(results[currentSource].length, 25))
                    .addOptions(createSongOptions(currentSource));

                const updatedInstructionDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.dot} Current Track:** \`${currentTrack.title}\`\n` +
                        `**${client.emoji.dot} Artist:** \`${currentTrack.author}\`\n` +
                        `**${client.emoji.dot} Current Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\` (\`${results[currentSource].length}\` tracks)\n` +
                        `**${client.emoji.dot} Total Results:** \`${totalResults}\` tracks across \`${sourceOptions.length}\` platforms`
                    );

                const updatedSourceRow = new ActionRowBuilder().addComponents(sourceMenu);
                const updatedSongRow = new ActionRowBuilder().addComponents(updatedSongMenu);

                const updatedContainer = new ContainerBuilder()
                    .addTextDisplayComponents(mainDisplay)
                    .addSeparatorComponents(separator1)
                    .addTextDisplayComponents(updatedInstructionDisplay)
                    .addSeparatorComponents(separator2)
                    .addTextDisplayComponents(helpDisplay)
                    .addActionRowComponents(updatedSourceRow)
                    .addActionRowComponents(updatedSongRow);

                await interaction.editReply({
                    components: [updatedContainer],
                    flags: MessageFlags.IsComponentsV2,
                });

            } else if (i.customId === 'similar_songs') {
                await i.deferUpdate();

                const addedTracks = [];

                for (const value of i.values) {
                    const [source, indexStr] = value.split('-');
                    const index = parseInt(indexStr);
                    const song = results[source][index];

                    if (song) {
                        player.queue.add(song);
                        addedTracks.push(song);
                    }
                }

                const successDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Similar Tracks Added to Queue**`);

                const successSeparator = new SeparatorBuilder();

                const resultDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.dot} Added:** \`${addedTracks.length}\` track(s)\n` +
                        `**${client.emoji.dot} Queue Position:** \`${player.queue.size - addedTracks.length + 1}\` - \`${player.queue.size}\`\n` +
                        `**${client.emoji.dot} Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\``
                    );

                const separator3 = new SeparatorBuilder();

                const tracksList = addedTracks.slice(0, 5).map((track, idx) =>
                    `**\`${idx + 1}\`** | **${track.title}** by \`${track.author}\` - \`${formatDuration(track.length)}\``
                ).join('\n');

                const tracksDisplay = new TextDisplayBuilder()
                    .setContent(tracksList + (addedTracks.length > 5 ? `\n\n*...and ${addedTracks.length - 5} more tracks*` : ''));

                const successContainer = new ContainerBuilder()
                    .addTextDisplayComponents(successDisplay)
                    .addSeparatorComponents(successSeparator)
                    .addTextDisplayComponents(resultDisplay)
                    .addSeparatorComponents(separator3)
                    .addTextDisplayComponents(tracksDisplay);

                await interaction.editReply({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                });

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                collector.stop('completed');
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' || reason === 'idle') {
                const timeoutDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.warn} Search Timeout**`);

                const timeoutSeparator = new SeparatorBuilder();

                const timeoutInfo = new TextDisplayBuilder()
                    .setContent(`The similar songs menu has timed out. Please run the command again to search for similar tracks.`);

                const timeoutContainer = new ContainerBuilder()
                    .addTextDisplayComponents(timeoutDisplay)
                    .addSeparatorComponents(timeoutSeparator)
                    .addTextDisplayComponents(timeoutInfo);

                await interaction.editReply({
                    components: [timeoutContainer],
                    flags: MessageFlags.IsComponentsV2,
                }).catch(() => { });
            }
        });
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} No Track Playing**`);

            const separator = new SeparatorBuilder();

            const infoDisplay = new TextDisplayBuilder()
                .setContent(`There is no track currently playing to find similar songs for.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(infoDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const loadingDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.load} Searching Similar Songs**`);

        const loadingSeparator = new SeparatorBuilder();

        const loadingInfo = new TextDisplayBuilder()
            .setContent(`Please wait while I search for similar tracks across all music platforms...`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingDisplay)
            .addSeparatorComponents(loadingSeparator)
            .addTextDisplayComponents(loadingInfo);

        const waitMsg = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2,
        });

        const currentTrack = player.queue.current;
        const searchQuery = `${currentTrack.title} ${currentTrack.author}`;

        const results = {
            youtube: [],
            ytmusic: [],
            spotify: [],
            applemusic: [],
            deezer: [],
            jiosaavn: []
        };

        const searchPromises = [
            searchPlatform(player, 'ytsearch', searchQuery, message.author).then(tracks => results.youtube = tracks),
            searchPlatform(player, 'ytmsearch', searchQuery, message.author).then(tracks => results.ytmusic = tracks),
            searchPlatform(player, 'spsearch', searchQuery, message.author).then(tracks => results.spotify = tracks),
            searchPlatform(player, 'amsearch', searchQuery, message.author).then(tracks => results.applemusic = tracks),
            searchPlatform(player, 'dzsearch', searchQuery, message.author).then(tracks => results.deezer = tracks),
            searchPlatform(player, 'jssearch', searchQuery, message.author).then(tracks => results.jiosaavn = tracks),
        ];

        await Promise.allSettled(searchPromises);

        const totalResults = Object.values(results).reduce((total, tracks) => total + tracks.length, 0);

        if (totalResults === 0) {
            const noResultsDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} No Similar Songs Found**`);

            const noResultsSeparator = new SeparatorBuilder();

            const noResultsInfo = new TextDisplayBuilder()
                .setContent(`No similar tracks found for "${currentTrack.title}" across any platform.`);

            const noResultsContainer = new ContainerBuilder()
                .addTextDisplayComponents(noResultsDisplay)
                .addSeparatorComponents(noResultsSeparator)
                .addTextDisplayComponents(noResultsInfo);

            return waitMsg.edit({
                components: [noResultsContainer],
                flags: MessageFlags.IsComponentsV2,
            });
        }

        const sourceOptions = [
            {
                label: 'YouTube',
                value: 'youtube',
                description: `${results.youtube.length} tracks found`,
                emoji: client.emoji.youtube,
            },
            {
                label: 'YouTube Music',
                value: 'ytmusic',
                description: `${results.ytmusic.length} tracks found`,
                emoji: client.emoji.ytmusic,
            },
            {
                label: 'Spotify',
                value: 'spotify',
                description: `${results.spotify.length} tracks found`,
                emoji: client.emoji.spotify,
            },
            {
                label: 'Apple Music',
                value: 'applemusic',
                description: `${results.applemusic.length} tracks found`,
                emoji: client.emoji.applemusic,
            },
            {
                label: 'Deezer',
                value: 'deezer',
                description: `${results.deezer.length} tracks found`,
                emoji: client.emoji.deezer,
            },
            {
                label: 'JioSaavn',
                value: 'jiosaavn',
                description: `${results.jiosaavn.length} tracks found`,
                emoji: client.emoji.jiosaavn,
            },
        ].filter(option => results[option.value].length > 0);

        let currentSource = sourceOptions[0].value;

        const createSongOptions = (source) => {
            const tracks = results[source].slice(0, 25);
            return tracks.map((track, index) => ({
                label: `${index + 1}. ${track.title.substring(0, 90)}`,
                value: `${source}-${index}`,
                description: `${track.author.substring(0, 90)} | ${formatDuration(track.length)}`,
            }));
        };

        const sourceMenu = new StringSelectMenuBuilder()
            .setCustomId('similar_source')
            .setPlaceholder('Select a music source')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions(sourceOptions);

        const songMenu = new StringSelectMenuBuilder()
            .setCustomId('similar_songs')
            .setPlaceholder('Select tracks to add to queue')
            .setMinValues(1)
            .setMaxValues(Math.min(results[currentSource].length, 25))
            .addOptions(createSongOptions(currentSource));

        const mainDisplay = new TextDisplayBuilder()
            .setContent(`**${client.emoji.info} Similar Songs Results**`);

        const separator1 = new SeparatorBuilder();

        const instructionDisplay = new TextDisplayBuilder()
            .setContent(
                `**${client.emoji.dot} Current Track:** \`${currentTrack.title}\`\n` +
                `**${client.emoji.dot} Artist:** \`${currentTrack.author}\`\n` +
                `**${client.emoji.dot} Current Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\` (\`${results[currentSource].length}\` tracks)\n` +
                `**${client.emoji.dot} Total Results:** \`${totalResults}\` tracks across \`${sourceOptions.length}\` platforms`
            );

        const separator2 = new SeparatorBuilder();

        const helpDisplay = new TextDisplayBuilder()
            .setContent(`Select a music source from the first dropdown, then choose similar tracks from the second dropdown.`);

        const sourceRow = new ActionRowBuilder().addComponents(sourceMenu);
        const songRow = new ActionRowBuilder().addComponents(songMenu);

        const container = new ContainerBuilder()
            .addTextDisplayComponents(mainDisplay)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(instructionDisplay)
            .addSeparatorComponents(separator2)
            .addTextDisplayComponents(helpDisplay)
            .addActionRowComponents(sourceRow)
            .addActionRowComponents(songRow);

        const reply = await waitMsg.edit({
            components: [container],
            flags: MessageFlags.IsComponentsV2,
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === message.author.id,
            time: 120000,
            idle: 60000
        });

        collector.on('collect', async (interaction) => {
            if (interaction.customId === 'similar_source') {
                await interaction.deferUpdate();

                currentSource = interaction.values[0];

                const updatedSongMenu = new StringSelectMenuBuilder()
                    .setCustomId('similar_songs')
                    .setPlaceholder('Select tracks to add to queue')
                    .setMinValues(1)
                    .setMaxValues(Math.min(results[currentSource].length, 25))
                    .addOptions(createSongOptions(currentSource));

                const updatedInstructionDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.dot} Current Track:** \`${currentTrack.title}\`\n` +
                        `**${client.emoji.dot} Artist:** \`${currentTrack.author}\`\n` +
                        `**${client.emoji.dot} Current Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\` (\`${results[currentSource].length}\` tracks)\n` +
                        `**${client.emoji.dot} Total Results:** \`${totalResults}\` tracks across \`${sourceOptions.length}\` platforms`
                    );

                const updatedSourceRow = new ActionRowBuilder().addComponents(sourceMenu);
                const updatedSongRow = new ActionRowBuilder().addComponents(updatedSongMenu);

                const updatedContainer = new ContainerBuilder()
                    .addTextDisplayComponents(mainDisplay)
                    .addSeparatorComponents(separator1)
                    .addTextDisplayComponents(updatedInstructionDisplay)
                    .addSeparatorComponents(separator2)
                    .addTextDisplayComponents(helpDisplay)
                    .addActionRowComponents(updatedSourceRow)
                    .addActionRowComponents(updatedSongRow);

                await reply.edit({
                    components: [updatedContainer],
                    flags: MessageFlags.IsComponentsV2,
                });

            } else if (interaction.customId === 'similar_songs') {
                await interaction.deferUpdate();

                const addedTracks = [];

                for (const value of interaction.values) {
                    const [source, indexStr] = value.split('-');
                    const index = parseInt(indexStr);
                    const song = results[source][index];

                    if (song) {
                        player.queue.add(song);
                        addedTracks.push(song);
                    }
                }

                const successDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.check} Similar Tracks Added to Queue**`);

                const successSeparator = new SeparatorBuilder();

                const resultDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.dot} Added:** \`${addedTracks.length}\` track(s)\n` +
                        `**${client.emoji.dot} Queue Position:** \`${player.queue.size - addedTracks.length + 1}\` - \`${player.queue.size}\`\n` +
                        `**${client.emoji.dot} Source:** \`${currentSource.charAt(0).toUpperCase() + currentSource.slice(1)}\``
                    );

                const separator3 = new SeparatorBuilder();

                const tracksList = addedTracks.slice(0, 5).map((track, i) =>
                    `**\`${i + 1}\`** | **${track.title}** by \`${track.author}\` - \`${formatDuration(track.length)}\``
                ).join('\n');

                const tracksDisplay = new TextDisplayBuilder()
                    .setContent(tracksList + (addedTracks.length > 5 ? `\n\n*...and ${addedTracks.length - 5} more tracks*` : ''));

                const successContainer = new ContainerBuilder()
                    .addTextDisplayComponents(successDisplay)
                    .addSeparatorComponents(successSeparator)
                    .addTextDisplayComponents(resultDisplay)
                    .addSeparatorComponents(separator3)
                    .addTextDisplayComponents(tracksDisplay);

                await reply.edit({
                    components: [successContainer],
                    flags: MessageFlags.IsComponentsV2,
                });

                if (!player.playing && !player.paused) {
                    await player.play();
                }

                collector.stop('completed');
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' || reason === 'idle') {
                const timeoutDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.warn} Search Timeout**`);

                const timeoutSeparator = new SeparatorBuilder();

                const timeoutInfo = new TextDisplayBuilder()
                    .setContent(`The similar songs menu has timed out. Please run the command again to search for similar tracks.`);

                const timeoutContainer = new ContainerBuilder()
                    .addTextDisplayComponents(timeoutDisplay)
                    .addSeparatorComponents(timeoutSeparator)
                    .addTextDisplayComponents(timeoutInfo);

                await reply.edit({
                    components: [timeoutContainer],
                    flags: MessageFlags.IsComponentsV2,
                }).catch(() => { });
            }
        });
    },
};

async function searchPlatform(player, engine, query, requester) {
    try {
        const result = await player.search(query, { engine, requester });
        return result.tracks || [];
    } catch (error) {
        console.error(`Error searching ${engine}:`, error);
        return [];
    }
}

function formatDuration(ms) {
    if (!ms || ms < 0 || ms === Infinity) return "Live";

    const seconds = Math.floor((ms / 1000) % 60).toString().padStart(2, "0");
    const minutes = Math.floor((ms / (1000 * 60)) % 60).toString().padStart(2, "0");
    const hours = Math.floor(ms / (1000 * 60 * 60));

    return hours > 0 ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
}

