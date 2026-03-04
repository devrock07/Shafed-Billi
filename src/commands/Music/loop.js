const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags
} = require("discord.js");

module.exports = {
    name: "loop",
    aliases: ["loop"],
    category: "Music",
    cooldown: 3,
    description: "Toggle music loop",
    botPrams: ["EmbedLinks"],
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,
    slashOptions: [
        {
            name: "enable",
            description: "Enable music loop",
            type: 1,
            options: [
                {
                    name: "mode",
                    description: "Select loop mode",
                    type: 3,
                    required: true,
                    choices: [
                        { name: "Track", value: "track" },
                        { name: "Queue", value: "queue" }
                    ]
                }
            ]
        },
        {
            name: "disable",
            description: "Disable music loop",
            type: 1
        }
    ],

    async slashExecute(interaction, client) {
        const interactionWrapper = {
            guild: interaction.guild,
            channel: interaction.channel,
            author: interaction.user,
            member: interaction.member,
            createdTimestamp: interaction.createdTimestamp,
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

        const subcommand = interaction.options.getSubcommand();
        const mode = interaction.options.getString("mode");
        const args = [subcommand];
        if (mode) args.push(mode);

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Play a song first.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const currentLoop = player.loop || "none";

        const createStep1Container = () => {
            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} Loop Settings**`);
            const separator = new SeparatorBuilder();
            const statusDisplay = new TextDisplayBuilder()
                .setContent(`**Current Mode** \`:\` \`${currentLoop === "none" ? "Disabled" : currentLoop === "track" ? "Track Loop" : "Queue Loop"}\``);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('loop_enable_prompt')
                    .setLabel('Enable')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(currentLoop !== 'none'),
                new ButtonBuilder()
                    .setCustomId('loop_off')
                    .setLabel('Disable')
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(currentLoop === 'none')
            );

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(statusDisplay)
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(row);
        };

        const createStep2Container = () => {
            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} Select Loop Mode**`);
            const separator = new SeparatorBuilder();
            const statusDisplay = new TextDisplayBuilder()
                .setContent(`**Please choose whether you want to loop the current track or the entire queue.**`);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('loop_track')
                    .setLabel('Track')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_queue')
                    .setLabel('Queue')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('loop_back')
                    .setLabel('Back')
                    .setStyle(ButtonStyle.Secondary)
            );

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(statusDisplay)
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(row);
        };

        const createFinalContainer = (mode) => {
            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.check} Loop Updated**`);
            const separator = new SeparatorBuilder();
            const statusDisplay = new TextDisplayBuilder()
                .setContent(`**Loop mode has been set to** \`:\` \`${mode === "none" ? "Disabled" : mode === "track" ? "Track Loop" : "Queue Loop"}\``);

            return new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(statusDisplay);
        };

        if (args[0]) {
            const action = args[0].toLowerCase();
            if (action === "disable" || action === "off") {
                player.setLoop("none");
                return message.reply({
                    components: [createFinalContainer("none")],
                    flags: MessageFlags.IsComponentsV2
                });
            } else if (action === "enable") {
                const mode = args[1]?.toLowerCase();
                if (mode === "track" || mode === "queue") {
                    player.setLoop(mode);
                    return message.reply({
                        components: [createFinalContainer(mode)],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                const msg = await message.reply({
                    components: [createStep2Container()],
                    flags: MessageFlags.IsComponentsV2
                });
                return handleCollector(msg);
            }
        }

        // Default interaction (no args)
        const msg = await message.reply({
            components: [createStep1Container()],
            flags: MessageFlags.IsComponentsV2
        });

        async function handleCollector(m) {
            const collector = m.createMessageComponentCollector({
                filter: (i) => {
                    if (i.user.id === message.author.id) return true;
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(`**${client.emoji.cross} Only ${message.author.tag} can use these buttons.**`);
                    const errorContainer = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
                    i.reply({ components: [errorContainer], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
                    return false;
                },
                time: 60000
            });

            collector.on('collect', async (interaction) => {
                if (interaction.customId === 'loop_enable_prompt') {
                    await interaction.update({ components: [createStep2Container()] });
                } else if (interaction.customId === 'loop_back') {
                    await interaction.update({ components: [createStep1Container()] });
                } else if (interaction.customId === 'loop_off') {
                    player.setLoop('none');
                    await interaction.update({ components: [createFinalContainer('none')] });
                    collector.stop();
                } else if (interaction.customId === 'loop_track') {
                    player.setLoop('track');
                    await interaction.update({ components: [createFinalContainer('track')] });
                    collector.stop();
                } else if (interaction.customId === 'loop_queue') {
                    player.setLoop('queue');
                    await interaction.update({ components: [createFinalContainer('queue')] });
                    collector.stop();
                }
            });

            collector.on('end', (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    m.edit({ components: [] }).catch(() => { });
                }
            });
        }

        if (!args[0]) {
            handleCollector(msg);
        }
    },
};

