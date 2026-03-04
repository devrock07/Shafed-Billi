const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');

module.exports = {
    name: 'membercount',
    aliases: ['members', 'mc', 'memberinfo', 'memberstats'],
    description: "Displays detailed server member statistics.",
    category: 'Utility',
    slashOptions: [],
    args: false,
    usage: "",
    userPerms: [],
    owner: false,

    async slashExecute(interaction, client) {
        await interaction.deferReply();

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

    async execute(message, args, client) {
        const guild = message.guild;

        await guild.members.fetch();

        const totalMembers = guild.memberCount;
        const members = guild.members.cache;

        const humans = members.filter(m => !m.user.bot).size;
        const bots = members.filter(m => m.user.bot).size;
        const online = members.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;

        const humanPercent = ((humans / totalMembers) * 100).toFixed(1);
        const botPercent = ((bots / totalMembers) * 100).toFixed(1);

        const formatNumber = (num) => {
            return num.toLocaleString();
        };

        const header = new TextDisplayBuilder()
            .setContent(`### Member Count\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator1 = new SeparatorBuilder();

        const statsContent = new TextDisplayBuilder()
            .setContent(
                "```yaml\n" +
                `Total Members : ${formatNumber(totalMembers)}\n` +
                `Humans        : ${formatNumber(humans)}\n` +
                `Bots          : ${formatNumber(bots)}\n` +
                `Online        : ${formatNumber(online)}\n` + "```"
            );



        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addSeparatorComponents(separator1)
            .addTextDisplayComponents(statsContent);

        await message.reply({
            content: '',
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
    }
};
