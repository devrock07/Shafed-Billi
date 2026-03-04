const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    AttachmentBuilder
} = require('discord.js');

module.exports = {
    name: 'getemojis',
    aliases: ['emojicode', 'emojijs', 'exportemojis'],
    description: "Generate emoji configuration code from current server emojis.",
    category: 'Owner',
    args: false,
    usage: "",
    userPerms: [],
    owner: true,
    cooldown: 5,

    async execute(message, args, client) {
        const guild = message.guild;
        const emojis = guild.emojis.cache;

        if (emojis.size === 0) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`${client.emoji?.cross || '❌'} **No emojis found!**\n\nThis server has no custom emojis.`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        // Generate the emoji code
        let emojiCode = 'module.exports = {\n';

        const sortedEmojis = Array.from(emojis.values()).sort((a, b) => a.name.localeCompare(b.name));

        for (const emoji of sortedEmojis) {
            const emojiString = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
            emojiCode += `  ${emoji.name}: "${emojiString}",\n`;
        }

        emojiCode += '};\n';

        // Create a text file with the code
        const attachment = new AttachmentBuilder(Buffer.from(emojiCode, 'utf-8'), {
            name: 'emojis.js'
        });

        // Send the response
        const header = new TextDisplayBuilder()
            .setContent(`### ${client.emoji?.check || '✅'} Emoji Configuration Generated\n-# ${guild.name}`);

        const separator = new SeparatorBuilder();

        const infoDisplay = new TextDisplayBuilder()
            .setContent(
                `**Server:** ${guild.name}\n` +
                `**Total Emojis:** ${emojis.size}\n` +
                `**Animated:** ${emojis.filter(e => e.animated).size}\n` +
                `**Static:** ${emojis.filter(e => !e.animated).size}\n\n` +
                `**File:** \`emojis.js\` attached below\n\n` +
                `Copy the content and replace your \`src/emojis.js\` file.`
            );

        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(infoDisplay);

        await message.reply({
            components: [container],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });

        // Also send a preview in a code block (if not too long)
        if (emojiCode.length <= 1900) {
            const previewDisplay = new TextDisplayBuilder()
                .setContent(`**Preview:**\n\`\`\`javascript\n${emojiCode}\`\`\``);

            const previewContainer = new ContainerBuilder()
                .addTextDisplayComponents(previewDisplay);

            await message.channel.send({
                components: [previewContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }
    }
};
