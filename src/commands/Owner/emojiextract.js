const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'emojiextract',
    aliases: ['extractemoji', 'cloneemoji', 'stealemoji'],
    description: "Extract all emojis from a server and upload them to the current server.",
    category: 'Owner',
    args: true,
    usage: "<server_id>",
    userPerms: [],
    owner: true,
    cooldown: 10,

    async execute(message, args, client) {
        const targetServerId = args[0];

        if (!targetServerId || !/^\d{17,19}$/.test(targetServerId)) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji?.cross || '❌'} **Invalid server ID!**\n\nUsage: \`!emojiextract <server_id>\``);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check if bot is in the target server
        const targetGuild = client.guilds.cache.get(targetServerId);
        if (!targetGuild) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji?.cross || '❌'} **Server not found!**\n\nI'm not in a server with ID: \`${targetServerId}\`\n\nMake sure the bot is in both servers.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Get emojis from target server
        const targetEmojis = targetGuild.emojis.cache;
        if (targetEmojis.size === 0) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji?.warn || '⚠️'} **No emojis found!**\n\nThe server **${targetGuild.name}** has no custom emojis.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Check emoji slots in current server
        const currentGuild = message.guild;
        const currentEmojis = currentGuild.emojis.cache;
        const maxEmojis = currentGuild.premiumTier === 3 ? 250 : currentGuild.premiumTier === 2 ? 150 : currentGuild.premiumTier === 1 ? 100 : 50;
        const availableSlots = maxEmojis - currentEmojis.size;

        if (availableSlots <= 0) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji?.cross || '❌'} **No emoji slots available!**\n\nCurrent server has **${currentEmojis.size}/${maxEmojis}** emojis.\nDelete some emojis first.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Send initial message
        const header = new TextDisplayBuilder()
            .setContent(`### ${client.emoji?.info || 'ℹ️'} Emoji Extraction Started\n-# Extracting from ${targetGuild.name}`);

        const separator = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
            .setContent(
                `**Source Server:** ${targetGuild.name}\n` +
                `**Target Server:** ${currentGuild.name}\n\n` +
                `**Found Emojis:** ${targetEmojis.size}\n` +
                `**Available Slots:** ${availableSlots}\n` +
                `**Will Upload:** ${Math.min(targetEmojis.size, availableSlots)}\n\n` +
                `${client.emoji?.loading || '⏳'} Starting extraction...`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(infoDisplay);

        const statusMsg = await message.reply({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });

        // Start extracting emojis
        let uploaded = 0;
        let failed = 0;
        const failedEmojis = [];
        const emojisToUpload = Array.from(targetEmojis.values()).slice(0, availableSlots);

        for (const emoji of emojisToUpload) {
            try {
                // Check if emoji with same name already exists
                const existingEmoji = currentGuild.emojis.cache.find(e => e.name === emoji.name);
                if (existingEmoji) {
                    failed++;
                    failedEmojis.push(`${emoji.name} (already exists)`);
                    continue;
                }

                // Upload emoji
                await currentGuild.emojis.create({
                    attachment: emoji.url,
                    name: emoji.name,
                    reason: `Emoji extraction from ${targetGuild.name} by ${message.author.tag}`
                });

                uploaded++;

                // Update progress every 5 emojis
                if (uploaded % 5 === 0) {
                    const progressDisplay = new TextDisplayBuilder()
                        .setContent(
                            `**Source Server:** ${targetGuild.name}\n` +
                            `**Target Server:** ${currentGuild.name}\n\n` +
                            `**Progress:** ${uploaded + failed}/${emojisToUpload.length}\n` +
                            `**Uploaded:** ${uploaded}\n` +
                            `**Failed:** ${failed}\n\n` +
                            `${client.emoji?.loading || '⏳'} Extracting...`
                        );

                    const progressContainer = new ContainerBuilder()
                        .addTextDisplayComponents(header)
                        .addSeparatorComponents(separator)
                        .addTextDisplayComponents(progressDisplay);

                    await statusMsg.edit({
                        components: [progressContainer],
                        flags: MessageFlags.IsComponentsV2
                    }).catch(() => { });
                }

                // Rate limit protection
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                failed++;
                failedEmojis.push(`${emoji.name} (${error.message})`);
            }
        }

        // Send final result
        const successHeader = new TextDisplayBuilder()
            .setContent(`### ${client.emoji?.check || '✅'} Emoji Extraction Complete\n-# Extraction finished`);

        const successSeparator = new SeparatorBuilder();

        let resultText =
            `**Source Server:** ${targetGuild.name}\n` +
            `**Target Server:** ${currentGuild.name}\n\n` +
            `**Total Found:** ${targetEmojis.size}\n` +
            `**Successfully Uploaded:** ${uploaded}\n` +
            `**Failed:** ${failed}\n\n`;

        if (failedEmojis.length > 0 && failedEmojis.length <= 10) {
            resultText += `**Failed Emojis:**\n${failedEmojis.map(e => `• ${e}`).join('\n')}`;
        } else if (failedEmojis.length > 10) {
            resultText += `**Failed Emojis:** Too many to display (${failedEmojis.length} total)`;
        }

        const resultDisplay = new TextDisplayBuilder()
            .setContent(resultText);

        const resultContainer = new ContainerBuilder()
            .addTextDisplayComponents(successHeader)
            .addSeparatorComponents(successSeparator)
            .addTextDisplayComponents(resultDisplay);

        await statusMsg.edit({
            components: [resultContainer],
            flags: MessageFlags.IsComponentsV2
        }).catch(() => { });
    }
};
