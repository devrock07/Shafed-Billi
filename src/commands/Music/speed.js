const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "speed",
    aliases: ["playback", "tempo"],
    category: "Music",
    cooldown: 3,
    description: "Change the playback speed of the current song",
    args: false,
    usage: "[speed]",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
    dj: true,
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,

    slashOptions: [
        {
            name: "speed",
            description: "Playback speed (0.25 - 3.0)",
            type: 10, // NUMBER
            required: false
        }
    ],

    async slashExecute(interaction, client) {
        const player = client.manager.players.get(interaction.guild.id);
        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.warn} Play a song first.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        const currentSpeed = player.data.get("speed") || 1.0;
        let speed = interaction.options.getNumber("speed");

        if (speed === null) {
            const headerDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.info} Speed Control**`);
            const separator1 = new SeparatorBuilder();
            const infoDisplay = new TextDisplayBuilder().setContent(`**Current speed** \`:\` \`${currentSpeed}x\`\n**Range** \`:\` \`0.25x - 3.0x\``);
            const container = new ContainerBuilder().addTextDisplayComponents(headerDisplay).addSeparatorComponents(separator1).addTextDisplayComponents(infoDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        if (speed < 0.25 || speed > 3) {
            const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.cross} Invalid speed value**\n**Valid range** \`:\` \`0.25x - 3.0x\``);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }

        try {
            const currentPitch = player.data.get("pitch") || 1.0;
            await player.shoukaku.setFilters({ timescale: { speed: speed, pitch: currentPitch, rate: 1.0 } });
            player.data.set("speed", speed);
            const successDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.check} Playback speed set to \`${speed}x\`**`);
            const container = new ContainerBuilder().addTextDisplayComponents(successDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        } catch (error) {
            console.error("Error setting speed:", error);
            const errorDisplay = new TextDisplayBuilder().setContent(`**${client.emoji.cross} Failed to change playback speed.**`);
            const container = new ContainerBuilder().addTextDisplayComponents(errorDisplay);
            return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);

        if (!player.queue.current) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.warn} Play a song first.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.channel.send({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const currentSpeed = player.data.get("speed") || 1.0;

        if (args.length === 0) {
            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.info} Speed Control**`);

            const separator1 = new SeparatorBuilder();

            const infoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**Current speed** \`:\` \`${currentSpeed}x\`\n` +
                    `**Range** \`:\` \`0.25x - 3.0x\``
                );

            const separator2 = new SeparatorBuilder();

            const promptDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.dot} Send a message with your desired speed** \`:\` \`0.5x\`, \`1.5x\`, \`2.0x\`, etc.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(infoDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(promptDisplay);

            const promptMsg = await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            const filter = (m) => m.author.id === message.author.id;
            const collector = message.channel.createMessageCollector({
                filter,
                time: 30000,
                max: 1
            });

            collector.on('collect', async (m) => {
                const speedInput = m.content.toLowerCase().replace('x', '').trim();
                const speed = parseFloat(speedInput);

                if (isNaN(speed) || speed < 0.25 || speed > 3) {
                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(
                            `**${client.emoji.cross} Invalid speed value**\n` +
                            `**Valid range** \`:\` \`0.25x - 3.0x\`\n` +
                            `**Examples** \`:\` \`0.5\`, \`1.5\`, \`2.0\``
                        );

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorDisplay);

                    await m.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                    return;
                }

                try {
                    const currentPitch = player.data.get("pitch") || 1.0;
                    await player.shoukaku.setFilters({
                        timescale: {
                            speed: speed,
                            pitch: currentPitch,
                            rate: 1.0
                        }
                    });
                    player.data.set("speed", speed);

                    const successDisplay = new TextDisplayBuilder()
                        .setContent(`**${client.emoji.check} Playback speed set to \`${speed}x\`**`);

                    const successContainer = new ContainerBuilder()
                        .addTextDisplayComponents(successDisplay);

                    await m.reply({
                        components: [successContainer],
                        flags: MessageFlags.IsComponentsV2
                    });

                    await promptMsg.delete().catch(() => { });
                } catch (error) {
                    console.error("Error setting speed:", error);

                    const errorDisplay = new TextDisplayBuilder()
                        .setContent(`**${client.emoji.cross} Failed to change playback speed.**`);

                    const errorContainer = new ContainerBuilder()
                        .addTextDisplayComponents(errorDisplay);

                    await m.reply({
                        components: [errorContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                }
            });

            collector.on('end', async (collected, reason) => {
                if (reason === 'time' && collected.size === 0) {
                    const timeoutDisplay = new TextDisplayBuilder()
                        .setContent(`**${client.emoji.info} Speed change timed out.**`);

                    const timeoutContainer = new ContainerBuilder()
                        .addTextDisplayComponents(timeoutDisplay);

                    await promptMsg.edit({
                        components: [timeoutContainer],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => { });
                }
            });

            return;
        }

        const speed = parseFloat(args[0]);

        if (isNaN(speed) || speed < 0.25 || speed > 3) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.cross} Invalid speed value**\n` +
                    `**Usage** \`:\` \`${prefix}speed [0.25-3.0]\`\n` +
                    `**Examples** \`:\` \`${prefix}speed 0.5\` (slow) | \`${prefix}speed 1.5\` (fast)\n` +
                    `**Current speed** \`:\` \`${currentSpeed}x\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        }

        try {
            const currentPitch = player.data.get("pitch") || 1.0;
            await player.shoukaku.setFilters({
                timescale: {
                    speed: speed,
                    pitch: currentPitch,
                    rate: 1.0
                }
            });
            player.data.set("speed", speed);

            const successDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.check} Playback speed set to \`${speed}x\`**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        } catch (error) {
            console.error("Error setting speed:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Failed to change playback speed.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );
        }
    },
};
