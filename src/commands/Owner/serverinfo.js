const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder
} = require("discord.js");
const emoji = require("../../emojis");

module.exports = {
    name: "serverinfo",
    category: "Owner",
    description: "Get detailed information about a server",
    aliases: ["si", "guildinfo", "guild"],
    args: false,
    usage: "<server_id>",
    permission: [],
    owner: true,

    slashOptions: [
        {
            name: "server_id",
            description: "The ID of the server to get information about",
            type: 3,
            required: true
        }
    ],
  async slashExecute(interaction, client) {
        if (!client.owners.includes(interaction.user.id)) {
            return;
        }

        const guildId = interaction.options.getString("server_id");

        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Could not find a server with ID \`${guildId}\`**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            const owner = await guild.fetchOwner().catch(() => null);
            const channels = guild.channels.cache;
            const roles = guild.roles.cache;
            const emojis = guild.emojis.cache;
            const stickers = guild.stickers.cache;

            let members;
            try {
                members = await guild.members.fetch();
            } catch {
                members = guild.members.cache;
            }

            const humans = members.filter(m => !m.user.bot).size;
            const bots = members.filter(m => m.user.bot).size;
            const onlineMembers = members.filter(m => m.presence?.status !== 'offline' && m.presence?.status).size;

            const textChannels = channels.filter(c => c.type === 0).size;
            const voiceChannels = channels.filter(c => c.type === 2).size;
            const categories = channels.filter(c => c.type === 4).size;
            const stageChannels = channels.filter(c => c.type === 13).size;
            const forumChannels = channels.filter(c => c.type === 15).size;
            const threads = channels.filter(c => c.isThread()).size;

            const animatedEmojis = emojis.filter(e => e.animated).size;
            const staticEmojis = emojis.filter(e => !e.animated).size;

            const verificationLevels = {
                0: "None",
                1: "Low",
                2: "Medium",
                3: "High",
                4: "Very High"
            };

            const explicitContentFilter = {
                0: "Disabled",
                1: "Members without roles",
                2: "All members"
            };

            const nsfwLevels = {
                0: "Default",
                1: "Explicit",
                2: "Safe",
                3: "Age Restricted"
            };

            const defaultNotifications = {
                0: "All Messages",
                1: "Only @mentions"
            };

            const boostLevel = guild.premiumTier || 0;
            const boostCount = guild.premiumSubscriptionCount || 0;

            const createdAt = Math.floor(guild.createdTimestamp / 1000);
            const joinedAt = guild.joinedTimestamp ? Math.floor(guild.joinedTimestamp / 1000) : null;

            const player = client.manager?.players?.get(guild.id);
            const playerStatus = player
                ? `\`Active\` (${player.playing ? '▶️ Playing' : player.paused ? '⏸️ Paused' : '⏹️ Idle'})`
                : '`Inactive`';

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.check} Server Information - ${guild.name}**`);

            const separator1 = new SeparatorBuilder();

            const basicInfoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Name** \`:\` \`${guild.name}\`\n` +
                    `**${client.emoji.dot} ID** \`:\` \`${guild.id}\`\n` +
                    `**${client.emoji.dot} Owner** \`:\` ${owner ? `\`${owner.user.tag}\` (\`${owner.id}\`)` : "`Unknown`"}\n` +
                    `**${client.emoji.dot} Created** \`:\` <t:${createdAt}:R>\n` +
                    (joinedAt ? `**${client.emoji.dot} Bot Joined** \`:\` <t:${joinedAt}:R>\n` : '') +
                    (guild.description ? `**${client.emoji.dot} Description** \`:\` \`${guild.description}\`\n` : '') +
                    (guild.vanityURLCode ? `**${client.emoji.dot} Vanity URL** \`:\` \`discord.gg/${guild.vanityURLCode}\`\n` : '') +
                    `**${client.emoji.dot} Preferred Locale** \`:\` \`${guild.preferredLocale}\``
                );

            const separator2 = new SeparatorBuilder();

            const memberStatsDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Total Members** \`:\` \`${guild.memberCount}\`\n` +
                    `**${client.emoji.dot} Humans** \`:\` \`${humans}\`\n` +
                    `**${client.emoji.dot} Bots** \`:\` \`${bots}\`\n` +
                    `**${client.emoji.dot} Online** \`:\` \`${onlineMembers}\`\n` +
                    `**${client.emoji.dot} Max Members** \`:\` \`${guild.maximumMembers || 'N/A'}\``
                );

            const separator3 = new SeparatorBuilder();

            const channelsDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Text Channels** \`:\` \`${textChannels}\`\n` +
                    `**${client.emoji.dot} Voice Channels** \`:\` \`${voiceChannels}\`\n` +
                    `**${client.emoji.dot} Stage Channels** \`:\` \`${stageChannels}\`\n` +
                    `**${client.emoji.dot} Forum Channels** \`:\` \`${forumChannels}\`\n` +
                    `**${client.emoji.dot} Categories** \`:\` \`${categories}\`\n` +
                    `**${client.emoji.dot} Active Threads** \`:\` \`${threads}\`\n` +
                    `**${client.emoji.dot} Total Channels** \`:\` \`${channels.size}\``
                );

            const separator4 = new SeparatorBuilder();

            const contentDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Roles** \`:\` \`${roles.size}\`\n` +
                    `**${client.emoji.dot} Emojis** \`:\` \`${emojis.size}\` (Static: \`${staticEmojis}\`, Animated: \`${animatedEmojis}\`)\n` +
                    `**${client.emoji.dot} Stickers** \`:\` \`${stickers.size}\`\n` +
                    `**${client.emoji.dot} Boost Level** \`:\` \`Tier ${boostLevel}\` (\`${boostCount}\` boosts)\n` +
                    `**${client.emoji.dot} File Size Limit** \`:\` \`${guild.maximumPresences ? (guild.maximumPresences / 1024 / 1024).toFixed(0) + 'MB' : '8MB'}\``
                );

            const separator5 = new SeparatorBuilder();

            const securityDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Verification Level** \`:\` \`${verificationLevels[guild.verificationLevel]}\`\n` +
                    `**${client.emoji.dot} Content Filter** \`:\` \`${explicitContentFilter[guild.explicitContentFilter]}\`\n` +
                    `**${client.emoji.dot} NSFW Level** \`:\` \`${nsfwLevels[guild.nsfwLevel]}\`\n` +
                    `**${client.emoji.dot} 2FA Requirement** \`:\` \`${guild.mfaLevel === 1 ? 'Enabled' : 'Disabled'}\`\n` +
                    `**${client.emoji.dot} Default Notifications** \`:\` \`${defaultNotifications[guild.defaultMessageNotifications]}\``
                );

            const separator6 = new SeparatorBuilder();

            const afkInfo = guild.afkChannel
                ? `<#${guild.afkChannelId}> (\`${guild.afkTimeout / 60}\` min)`
                : '`None`';

            const systemChannel = guild.systemChannel
                ? `<#${guild.systemChannelId}>`
                : '`None`';

            const rulesChannel = guild.rulesChannel
                ? `<#${guild.rulesChannelId}>`
                : '`None`';

            const otherInfoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} AFK Channel** \`:\` ${afkInfo}\n` +
                    `**${client.emoji.dot} System Channel** \`:\` ${systemChannel}\n` +
                    `**${client.emoji.dot} Rules Channel** \`:\` ${rulesChannel}\n` +
                    `**${client.emoji.dot} Music Player** \`:\` ${playerStatus}\n` +
                    `**${client.emoji.dot} Large Server** \`:\` \`${guild.large ? 'Yes' : 'No'}\``
                );

            const separator7 = new SeparatorBuilder();

            const featuresText = guild.features.length > 0
                ? guild.features.slice(0, 15).map(f => `\`${f.replace(/_/g, ' ')}\``).join(', ') + (guild.features.length > 15 ? ` +${guild.features.length - 15} more` : '')
                : '`None`';

            const featuresDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.dot} Features** \`:\` ${featuresText}`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(basicInfoDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(memberStatsDisplay)
                .addSeparatorComponents(separator3)
                .addTextDisplayComponents(channelsDisplay)
                .addSeparatorComponents(separator4)
                .addTextDisplayComponents(contentDisplay)
                .addSeparatorComponents(separator5)
                .addTextDisplayComponents(securityDisplay)
                .addSeparatorComponents(separator6)
                .addTextDisplayComponents(otherInfoDisplay)
                .addSeparatorComponents(separator7)
                .addTextDisplayComponents(featuresDisplay);

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error("Error in serverinfo command:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} An error occurred while fetching server information.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
  async execute(message, args, client, prefix) {
        if (!client.owners.includes(message.author.id)) {
            return;
        }

        const guildId = args[0];

        if (!guildId) {
            const usageDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Usage** \`:\` \`${prefix}serverinfo <server_id>\`\n` +
                    `**${client.emoji.dot} Example** \`:\` \`${prefix}serverinfo 1234567890123456789\``
                );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(usageDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        let guild;
        try {
            guild = await client.guilds.fetch(guildId);
        } catch (error) {
            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} Could not find a server with ID \`${guildId}\`**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }

        try {
            const owner = await guild.fetchOwner().catch(() => null);
            const channels = guild.channels.cache;
            const roles = guild.roles.cache;
            const emojis = guild.emojis.cache;
            const stickers = guild.stickers.cache;

            let members;
            try {
                members = await guild.members.fetch();
            } catch {
                members = guild.members.cache;
            }

            const humans = members.filter(m => !m.user.bot).size;
            const bots = members.filter(m => m.user.bot).size;
            const onlineMembers = members.filter(m => m.presence?.status !== 'offline' && m.presence?.status).size;

            const textChannels = channels.filter(c => c.type === 0).size;
            const voiceChannels = channels.filter(c => c.type === 2).size;
            const categories = channels.filter(c => c.type === 4).size;
            const stageChannels = channels.filter(c => c.type === 13).size;
            const forumChannels = channels.filter(c => c.type === 15).size;
            const threads = channels.filter(c => c.isThread()).size;

            const animatedEmojis = emojis.filter(e => e.animated).size;
            const staticEmojis = emojis.filter(e => !e.animated).size;

            const verificationLevels = {
                0: "None",
                1: "Low",
                2: "Medium",
                3: "High",
                4: "Very High"
            };

            const explicitContentFilter = {
                0: "Disabled",
                1: "Members without roles",
                2: "All members"
            };

            const nsfwLevels = {
                0: "Default",
                1: "Explicit",
                2: "Safe",
                3: "Age Restricted"
            };

            const defaultNotifications = {
                0: "All Messages",
                1: "Only @mentions"
            };

            const boostLevel = guild.premiumTier || 0;
            const boostCount = guild.premiumSubscriptionCount || 0;

            const createdAt = Math.floor(guild.createdTimestamp / 1000);
            const joinedAt = guild.joinedTimestamp ? Math.floor(guild.joinedTimestamp / 1000) : null;

            const player = client.manager?.players?.get(guild.id);
            const playerStatus = player
                ? `\`Active\` (${player.playing ? '▶️ Playing' : player.paused ? '⏸️ Paused' : '⏹️ Idle'})`
                : '`Inactive`';

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.check} Server Information - ${guild.name}**`);

            const separator1 = new SeparatorBuilder();

            const basicInfoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Name** \`:\` \`${guild.name}\`\n` +
                    `**${client.emoji.dot} ID** \`:\` \`${guild.id}\`\n` +
                    `**${client.emoji.dot} Owner** \`:\` ${owner ? `\`${owner.user.tag}\` (\`${owner.id}\`)` : "`Unknown`"}\n` +
                    `**${client.emoji.dot} Created** \`:\` <t:${createdAt}:R>\n` +
                    (joinedAt ? `**${client.emoji.dot} Bot Joined** \`:\` <t:${joinedAt}:R>\n` : '') +
                    (guild.description ? `**${client.emoji.dot} Description** \`:\` \`${guild.description}\`\n` : '') +
                    (guild.vanityURLCode ? `**${client.emoji.dot} Vanity URL** \`:\` \`discord.gg/${guild.vanityURLCode}\`\n` : '') +
                    `**${client.emoji.dot} Preferred Locale** \`:\` \`${guild.preferredLocale}\``
                );

            const separator2 = new SeparatorBuilder();

            const memberStatsDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Total Members** \`:\` \`${guild.memberCount}\`\n` +
                    `**${client.emoji.dot} Humans** \`:\` \`${humans}\`\n` +
                    `**${client.emoji.dot} Bots** \`:\` \`${bots}\`\n` +
                    `**${client.emoji.dot} Online** \`:\` \`${onlineMembers}\`\n` +
                    `**${client.emoji.dot} Max Members** \`:\` \`${guild.maximumMembers || 'N/A'}\``
                );

            const separator3 = new SeparatorBuilder();

            const channelsDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Text Channels** \`:\` \`${textChannels}\`\n` +
                    `**${client.emoji.dot} Voice Channels** \`:\` \`${voiceChannels}\`\n` +
                    `**${client.emoji.dot} Stage Channels** \`:\` \`${stageChannels}\`\n` +
                    `**${client.emoji.dot} Forum Channels** \`:\` \`${forumChannels}\`\n` +
                    `**${client.emoji.dot} Categories** \`:\` \`${categories}\`\n` +
                    `**${client.emoji.dot} Active Threads** \`:\` \`${threads}\`\n` +
                    `**${client.emoji.dot} Total Channels** \`:\` \`${channels.size}\``
                );

            const separator4 = new SeparatorBuilder();

            const contentDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Roles** \`:\` \`${roles.size}\`\n` +
                    `**${client.emoji.dot} Emojis** \`:\` \`${emojis.size}\` (Static: \`${staticEmojis}\`, Animated: \`${animatedEmojis}\`)\n` +
                    `**${client.emoji.dot} Stickers** \`:\` \`${stickers.size}\`\n` +
                    `**${client.emoji.dot} Boost Level** \`:\` \`Tier ${boostLevel}\` (\`${boostCount}\` boosts)\n` +
                    `**${client.emoji.dot} File Size Limit** \`:\` \`${guild.maximumPresences ? (guild.maximumPresences / 1024 / 1024).toFixed(0) + 'MB' : '8MB'}\``
                );

            const separator5 = new SeparatorBuilder();

            const securityDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} Verification Level** \`:\` \`${verificationLevels[guild.verificationLevel]}\`\n` +
                    `**${client.emoji.dot} Content Filter** \`:\` \`${explicitContentFilter[guild.explicitContentFilter]}\`\n` +
                    `**${client.emoji.dot} NSFW Level** \`:\` \`${nsfwLevels[guild.nsfwLevel]}\`\n` +
                    `**${client.emoji.dot} 2FA Requirement** \`:\` \`${guild.mfaLevel === 1 ? 'Enabled' : 'Disabled'}\`\n` +
                    `**${client.emoji.dot} Default Notifications** \`:\` \`${defaultNotifications[guild.defaultMessageNotifications]}\``
                );

            const separator6 = new SeparatorBuilder();

            const afkInfo = guild.afkChannel
                ? `<#${guild.afkChannelId}> (\`${guild.afkTimeout / 60}\` min)`
                : '`None`';

            const systemChannel = guild.systemChannel
                ? `<#${guild.systemChannelId}>`
                : '`None`';

            const rulesChannel = guild.rulesChannel
                ? `<#${guild.rulesChannelId}>`
                : '`None`';

            const otherInfoDisplay = new TextDisplayBuilder()
                .setContent(
                    `**${client.emoji.dot} AFK Channel** \`:\` ${afkInfo}\n` +
                    `**${client.emoji.dot} System Channel** \`:\` ${systemChannel}\n` +
                    `**${client.emoji.dot} Rules Channel** \`:\` ${rulesChannel}\n` +
                    `**${client.emoji.dot} Music Player** \`:\` ${playerStatus}\n` +
                    `**${client.emoji.dot} Large Server** \`:\` \`${guild.large ? 'Yes' : 'No'}\``
                );

            const separator7 = new SeparatorBuilder();

            const featuresText = guild.features.length > 0
                ? guild.features.slice(0, 15).map(f => `\`${f.replace(/_/g, ' ')}\``).join(', ') + (guild.features.length > 15 ? ` +${guild.features.length - 15} more` : '')
                : '`None`';

            const featuresDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.dot} Features** \`:\` ${featuresText}`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(basicInfoDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(memberStatsDisplay)
                .addSeparatorComponents(separator3)
                .addTextDisplayComponents(channelsDisplay)
                .addSeparatorComponents(separator4)
                .addTextDisplayComponents(contentDisplay)
                .addSeparatorComponents(separator5)
                .addTextDisplayComponents(securityDisplay)
                .addSeparatorComponents(separator6)
                .addTextDisplayComponents(otherInfoDisplay)
                .addSeparatorComponents(separator7)
                .addTextDisplayComponents(featuresDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        } catch (error) {
            console.error("Error in serverinfo command:", error);

            const errorDisplay = new TextDisplayBuilder()
                .setContent(`**${client.emoji.cross} An error occurred while fetching server information.**`);

            const container = new ContainerBuilder()
                .addTextDisplayComponents(errorDisplay);

            return message.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
        }
    },
};
