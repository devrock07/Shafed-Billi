const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField
} = require("discord.js");
const TwoFourSeven = require("../../schema/247");

module.exports = {
    name: "move",
    aliases: ["mv"],
    category: "Music",
    description: "Move the bot to your current voice channel",
    args: false,
    usage: "",
    userPrams: [],
    botPrams: ["EmbedLinks"],
    owner: false,
    player: false,
    inVoiceChannel: true,
    sameVoiceChannel: false,
    slashOptions: [],

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

        const args = [];
        if (interaction.options) {
            const options = interaction.options.data;
            for (const option of options) {
                if (option.value !== undefined) {
                    args.push(option.value.toString());
                }
            }
        }

        const prefix = client.prefix;
        return this.execute(interactionWrapper, args, client, prefix);
    },

    async execute(message, args, client, prefix) {
        const player = client.manager.players.get(message.guild.id);
        const { channel } = message.member.voice;

        // If no player exists, create one (join the channel)
        if (!player) {
            // Check permissions
            if (
                !message.guild.members.me.permissions.has(
                    PermissionsBitField.resolve(["Speak", "Connect"]),
                )
            ) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.warn} I don't have enough permissions to execute this command! Please give me permission \`CONNECT\` or \`SPEAK\`.**`
                    );

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            try {
                // Create a new player
                await client.manager.createPlayer({
                    guildId: message.guild.id,
                    voiceId: channel.id,
                    textId: message.channel.id,
                    volume: 100,
                    deaf: true,
                    mute: false,
                });

                const successDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.check} Joined <#${channel.id}> and bound to <#${message.channel.id}>**`
                    );

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(successDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (error) {
                console.error(error);

                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${client.emoji.warn} An error occurred while joining the channel.**`);

                const container = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return message.reply({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            }
        }

        if (player.voiceId === channel.id) {
            const warnDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.warn} I am already in your voice channel.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(warnDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            player.setVoiceChannel(channel.id);

            const twoFourSeven = await TwoFourSeven.findOne({ Guild: message.guild.id });
            let is247Updated = false;

            if (twoFourSeven) {
                await TwoFourSeven.findOneAndUpdate(
                    { Guild: message.guild.id },
                    { VoiceId: channel.id, TextId: message.channel.id },
                    { new: true }
                );
                is247Updated = true;
            }

            const description = is247Updated
                ? `**${client.emoji.check} Moved to <#${channel.id}>**\n**${client.emoji.info} Updated 247 mode to this channel**`
                : `**${client.emoji.check} Moved to <#${channel.id}>**`;

            const successDisplay = new TextDisplayBuilder()
                .setContent(description);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(successDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error(error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.warn} An error occurred while moving.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};

