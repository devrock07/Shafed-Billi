const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "forward",
    aliases: ["ff", "fastforward"],
    category: "Music",
    cooldown: 3,
    description: "Fast forward the current song by specified seconds",
    args: false,
    usage: "[seconds]",
    userPrams: [],
    botPrams: ["EMBED_LINKS"],
    owner: false,
    player: true,
    inVoiceChannel: true,
    sameVoiceChannel: true,
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

        const currentTrack = player.queue.current;
        const duration = currentTrack.length;

        let seconds = 10;

        if (args.length > 0) {
            seconds = parseInt(args[0]);

            if (isNaN(seconds) || seconds <= 0) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(
                        `**${client.emoji.cross} Usage:** \`${prefix}forward [seconds]\`\n` +
                        `**Example:** \`${prefix}forward 30\` - Fastforward 30 seconds`
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
        }

        const currentPosition = player.position;
        const newPosition = currentPosition + (seconds * 1000);

        if (newPosition >= duration) {
            const warnDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.warn} Cannot fast forward beyond the song duration.**\n` +
                    `**${client.emoji.info} Skipping to next song instead...**`
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(warnDisplay);

            await message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            }).catch(() =>
                message.channel.send({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                })
            );

            return player.skip();
        }

        try {
            await player.seek(newPosition);

            const formatTime = (ms) => {
                const totalSeconds = Math.floor(ms / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const secs = totalSeconds % 60;
                return `${minutes}:${secs.toString().padStart(2, '0')}`;
            };

            const successDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.check} Fast forwarded \`${seconds}s\` to \`${formatTime(newPosition)}\`**`
                );

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
            console.error("Error fast forwarding:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Failed to fast forward the track.**`);

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
