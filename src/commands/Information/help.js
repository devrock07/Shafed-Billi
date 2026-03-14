const {
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const config = require('../../config.js');
const fs = require('fs');
const path = require('path');
const emoji = require("../../emojis");
const Prefix = require("../../schema/prefix");
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');

const categoryInfo = {
    'Config': {
        emoji: '<:config:1460240977397809357>',
        description: 'System Configuration'
    },
    'Filters': {
        emoji: '<:Filters:1460241627774849055>',
        description: 'Audio Effects & Equalizer'
    },
    'Information': {
        emoji: '<:infoWhite:1460242053404430389>',
        description: 'Bot Status & Information'
    },
    'Music': {
        emoji: '<:white_musicnote:1460242255276408923>',
        description: 'Music & Playback Controls'
    },
    'Favourite': {
        emoji: '<:favourite:1460242470683021384>',
        description: 'Liked Songs & Playlists'
    },
    'Utility': {
        emoji: '<:utility:1460242603797774500>',
        description: 'Essential Utilities'
    }
};

// Generate category banner
const generateCategoryBanner = async (client, categoryName, categoryEmoji) => {
    const width = 930;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // --- Background Layer ---
    // Deep dark background
    ctx.fillStyle = '#050507';
    ctx.fillRect(0, 0, width, height);

    // Subtle pink radial glow in the center
    const radialGlow = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
    radialGlow.addColorStop(0, 'rgba(255, 20, 147, 0.1)'); // Deep Pink
    radialGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // --- Tech Grid Pattern ---
    ctx.strokeStyle = 'rgba(255, 20, 147, 0.05)';
    ctx.lineWidth = 1;
    const gridSize = 30;
    for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
    ctx.fillRect(260, 40, width - 300, height - 80);
    ctx.strokeStyle = 'rgba(255, 20, 147, 0.1)';
    ctx.lineWidth = 2;
    ctx.strokeRect(260, 40, width - 300, height - 80);

    // --- Bot Avatar Layer ---
    try {
        const avatarParams = { extension: 'png', size: 256 };
        const avatarUrl = client.user.displayAvatarURL(avatarParams);
        const res = await axios.get(avatarUrl, { responseType: 'arraybuffer', timeout: 3000 });
        const avatarImage = await loadImage(Buffer.from(res.data));

        // Main Avatar Circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(140, height / 2, 100, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatarImage, 40, height / 2 - 100, 200, 200);
        ctx.restore();

        // Complex Outer Rings
        // Ring 1: Glowing pink
        ctx.shadowColor = '#FF1493';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#FF1493';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(140, height / 2, 105, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Ring 2: Subtle white dashed
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 15]);
        ctx.beginPath();
        ctx.arc(140, height / 2, 115, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]); // Reset
    } catch (e) {
        ctx.fillStyle = '#FF1493';
        ctx.beginPath();
        ctx.arc(140, height / 2, 100, 0, Math.PI * 2, true);
        ctx.fill();
    }

    // --- Typography Section ---
    // Bot Name (Top small)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('SHAFED BILLI', 300, 80);

    // Main Category Title
    ctx.shadowColor = '#FF1493';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px Arial';
    ctx.fillText(categoryName.toUpperCase(), 300, 150);
    ctx.shadowBlur = 0;

    // Subtitle Description
    ctx.fillStyle = '#FF1493';
    ctx.font = 'bold 22px Arial';
    const subText = categoryName === 'Help Menu' ? 'PREMIUM HIGH-FIDELITY MUSIC' : `${categoryName.toUpperCase()} MODULE INTERFACE`;
    ctx.fillText(subText, 300, 190);

    // Branding / Copyright (Devrock)
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('DEVELOPED BY', 300, 240);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.fillText('DEVROCK', 430, 240);

    // Top Right Accent Shape
    ctx.fillStyle = 'rgba(255, 20, 147, 0.15)';
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width - 150, 0);
    ctx.lineTo(width, 150);
    ctx.closePath();
    ctx.fill();

    try {
        const pngData = await canvas.encode('png');
        return pngData;
    } catch {
        return null;
    }
};

module.exports = {
    name: 'help',
    category: 'Information',
    aliases: ['h'],
    description: 'Shows all commands with categories',
    slashOptions: [
        {
            name: 'command',
            description: 'Shows about a specific command',
            type: 3,
            required: false,
            autocomplete: true
        }
    ],

    autocomplete: async (interaction, client) => {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const commandsPath = path.join(__dirname, '..', '..', 'commands');

        const allCommands = [];
        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name) {
                        allCommands.push({
                            name: command.name,
                            category: category
                        });
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        const filtered = allCommands
            .filter(cmd => cmd.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map(cmd => ({
                name: `${cmd.name}`,
                value: cmd.name
            }));

        await interaction.respond(filtered).catch(() => { });
    },

    async slashExecute(interaction, client) {
        // Loading indicator
        const loadingText = new TextDisplayBuilder()
            .setContent(`### ${emoji.load} Initializing Interface...`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingText);

        await interaction.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const commandName = interaction.options.getString('command');
        const commandsPath = path.join(__dirname, '..', '..', 'commands');


        if (commandName) {
            const categories = fs.readdirSync(commandsPath)
                .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
                .filter(folder => folder.toLowerCase() !== 'owner');

            let foundCommand = null;
            let commandCategory = null;

            for (const category of categories) {
                const categoryPath = path.join(commandsPath, category);
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(categoryPath, file);
                    try {
                        const command = require(filePath);
                        if (command.name && command.name.toLowerCase() === commandName.toLowerCase()) {
                            foundCommand = command;
                            commandCategory = category;
                            break;
                        }
                    } catch (error) {
                        console.error(`Error loading command at ${filePath}:`, error);
                    }
                }
                if (foundCommand) break;
            }

            if (!foundCommand) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} Command \`${commandName}\` not found.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.editReply({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }


            const headerDisplay = new TextDisplayBuilder()
                .setContent(`### ${client.emoji.check} Command: \`${foundCommand.name.toUpperCase()}\`\n-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const separator1 = new SeparatorBuilder();

            let detailsText = `**${emoji.dot} Description:** ${foundCommand.description || 'No description available'}\n`;
            detailsText += `**${emoji.dot} Category:** \`${commandCategory}\`\n`;

            if (foundCommand.aliases && foundCommand.aliases.length > 0) {
                detailsText += `**${emoji.dot} Aliases:** ${foundCommand.aliases.map(a => `\`${a}\``).join(', ')}\n`;
            }

            if (foundCommand.cooldown) {
                detailsText += `**${emoji.dot} Cooldown:** \`${foundCommand.cooldown}s\`\n`;
            }

            const detailsDisplay = new TextDisplayBuilder()
                .setContent(detailsText);

            const separator2 = new SeparatorBuilder();


            const prefix = config.prefix || '.';
            let usageText = `**${emoji.dot} Usage:** \`/${foundCommand.name}`;

            if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0) {
                foundCommand.slashOptions.forEach(opt => {
                    if (opt.required) {
                        usageText += ` <${opt.name}>`;
                    } else {
                        usageText += ` [${opt.name}]`;
                    }
                });
            }
            usageText += `\`\n`;
            usageText += `**${emoji.dot} Example:** \`/${foundCommand.name}`;

            if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0) {
                const exampleOpt = foundCommand.slashOptions[0];
                if (exampleOpt.name === 'song' || exampleOpt.name === 'query') {
                    usageText += ` imagine dragons believer`;
                } else if (exampleOpt.name === 'user') {
                    usageText += ` @user`;
                } else {
                    usageText += ` ${exampleOpt.name}`;
                }
            }
            usageText += `\``;

            const usageDisplay = new TextDisplayBuilder()
                .setContent(usageText);

            const commandContainer = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(detailsDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(usageDisplay);

            return interaction.editReply({
                components: [commandContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }


        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        const categoryData = {};
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            categoryData[category] = [];
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name && command.description) {
                        categoryData[category].push({
                            name: command.name,
                            description: command.description,
                            emoji: command.emoji
                        });
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        const homeBannerData = await generateCategoryBanner(client, 'Help Menu', '🏠');
        const attachmentName = 'help-banner.png';
        const attachment = homeBannerData ? new AttachmentBuilder(homeBannerData, { name: attachmentName }) : null;
        const gallery = attachment ? new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
        ) : null;

        const headerDisplay = new TextDisplayBuilder()
            .setContent(`### ${client.emoji.check} Shafed Billi Help\n-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator = new SeparatorBuilder();

        const descriptionText = `>>> **SHAFED BILLI**\n\nExperience high-fidelity audio streaming with advanced controls and seamless playback.\n\n**Select a category below to explore commands.**`;

        const descriptionDisplay = new TextDisplayBuilder()
            .setContent(descriptionText);

        const separator2 = new SeparatorBuilder();


        const categoryOptions = categories.map(cat => {
            const info = categoryInfo[cat] || { emoji: '📁', description: `${cat.toLowerCase()} commands` };
            return {
                label: cat,
                value: cat,
                description: info.description,
                emoji: info.emoji
            };
        });

        categoryOptions.unshift({
            label: 'Home',
            value: 'home',
            description: 'Go back to homepage',
            emoji: '<:home:1460242896786817087>'
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Select a category...')
            .addOptions(categoryOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const helpContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator);
        if (gallery) {
            helpContainer.addMediaGalleryComponents(gallery).addSeparatorComponents(separator);
        }
        helpContainer
            .addTextDisplayComponents(descriptionDisplay)
            .addSeparatorComponents(separator2)
            .addActionRowComponents(row);

        const sendPayload = {
            components: [helpContainer],
            flags: MessageFlags.IsComponentsV2
        };
        if (attachment) sendPayload.files = [attachment];
        const sentMessage = await interaction.editReply(sendPayload);

        const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} You can't use this menu.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return i.reply({
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            const selectedValue = i.values[0];

            if (selectedValue === 'home') {
                await i.update({
                    components: [helpContainer],
                    files: [attachment],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            const selectedCategory = selectedValue;
            const commandsList = categoryData[selectedCategory];
            const info = categoryInfo[selectedCategory] || { emoji: '📁', description: `${selectedCategory.toLowerCase()} commands` };

            const categoryBannerData = await generateCategoryBanner(client, selectedCategory, info.emoji);
            const categoryAttachment = categoryBannerData ? new AttachmentBuilder(categoryBannerData, { name: attachmentName }) : null;
            const categoryGallery = categoryAttachment ? new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
            ) : null;

            const categoryHeader = new TextDisplayBuilder()
                .setContent(`### ${client.emoji.check} ${selectedCategory} Commands\n-# Requested by ${interaction.user.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const catSeparator = new SeparatorBuilder();

            const commandsText = commandsList.length > 0
                ? commandsList.map(cmd => `\`${cmd.name}\``).join(', ')
                : 'No commands found';

            const commandsDisplay = new TextDisplayBuilder()
                .setContent(commandsText);

            const catSeparator2 = new SeparatorBuilder();

            let serverPrefix = config.prefix || '.';
            try {
                const prefixData = await Prefix.findOne({ Guild: interaction.guild.id });
                if (prefixData && prefixData.Prefix) {
                    serverPrefix = prefixData.Prefix;
                }
            } catch (err) {
            }

            const tipText = `-# use \`${serverPrefix}help <cmd name>\` to get more details\n-# © Created by DEVROCK`;
            const tipDisplay = new TextDisplayBuilder()
                .setContent(tipText);

            const categoryContainer = new ContainerBuilder()
                .addTextDisplayComponents(categoryHeader)
                .addSeparatorComponents(catSeparator);
            if (categoryGallery) {
                categoryContainer.addMediaGalleryComponents(categoryGallery).addSeparatorComponents(catSeparator);
            }
            categoryContainer
                .addTextDisplayComponents(commandsDisplay)
                .addSeparatorComponents(catSeparator2)
                .addTextDisplayComponents(tipDisplay)
                .addActionRowComponents(row);

            await i.update({
                components: [categoryContainer],
                files: [categoryAttachment],
                flags: MessageFlags.IsComponentsV2
            });
        });

        collector.on('end', () => {
            const timedOutMenu = new StringSelectMenuBuilder()
                .setCustomId('help_menu_disabled')
                .setPlaceholder('Menu timed out')
                .setDisabled(true)
                .addOptions([{
                    label: 'Expired',
                    value: 'expired'
                }]);

            const timedOutRow = new ActionRowBuilder().addComponents(timedOutMenu);

            const finalContainer = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(descriptionDisplay)
                .addSeparatorComponents(separator2)
                .addActionRowComponents(timedOutRow);

            sentMessage.edit({ components: [finalContainer] }).catch(() => { });
        });
    },

    async execute(message, args, client) {
        // Loading indicator
        const loadingText = new TextDisplayBuilder()
            .setContent(`### ${emoji.load} Initializing Interface...`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingText);

        const loadingMsg = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
        });

        const commandName = args[0];
        const commandsPath = path.join(__dirname, '..', '..', 'commands');

        if (commandName) {
            const categories = fs.readdirSync(commandsPath)
                .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
                .filter(folder => folder.toLowerCase() !== 'owner');

            let foundCommand = null;
            let commandCategory = null;

            for (const category of categories) {
                const categoryPath = path.join(commandsPath, category);
                const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

                for (const file of commandFiles) {
                    const filePath = path.join(categoryPath, file);
                    try {
                        const command = require(filePath);
                        if (command.name && command.name.toLowerCase() === commandName.toLowerCase()) {
                            foundCommand = command;
                            commandCategory = category;
                            break;
                        }
                    } catch (error) {
                        console.error(`Error loading command at ${filePath}:`, error);
                    }
                }
                if (foundCommand) break;
            }

            if (!foundCommand) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} Command \`${commandName}\` not found.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return loadingMsg.edit({
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2
                });
            }

            const headerDisplay = new TextDisplayBuilder()
                .setContent(`### ${emoji.check} Command: \`${foundCommand.name.toUpperCase()}\`\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const separator1 = new SeparatorBuilder();

            let detailsText = `**${emoji.dot} Description:** ${foundCommand.description || 'No description available'}\n`;
            detailsText += `**${emoji.dot} Category:** \`${commandCategory}\`\n`;

            if (foundCommand.aliases && foundCommand.aliases.length > 0) {
                detailsText += `**${emoji.dot} Aliases:** ${foundCommand.aliases.map(a => `\`${a}\``).join(', ')}\n`;
            }

            if (foundCommand.cooldown) {
                detailsText += `**${emoji.dot} Cooldown:** \`${foundCommand.cooldown}s\`\n`;
            }

            const detailsDisplay = new TextDisplayBuilder()
                .setContent(detailsText);

            const separator2 = new SeparatorBuilder();

            const prefix = config.prefix || '.';
            let usageText = `**${emoji.dot} Usage:** \`${prefix}${foundCommand.name}`;

            if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0) {
                foundCommand.slashOptions.forEach(opt => {
                    if (opt.required) {
                        usageText += ` <${opt.name}>`;
                    } else {
                        usageText += ` [${opt.name}]`;
                    }
                });
            }
            usageText += `\`\n`;
            usageText += `**${emoji.dot} Example:** \`${prefix}${foundCommand.name}`;

            if (foundCommand.slashOptions && foundCommand.slashOptions.length > 0) {
                const exampleOpt = foundCommand.slashOptions[0];
                if (exampleOpt.name === 'song' || exampleOpt.name === 'query') {
                    usageText += ` imagine dragons believer`;
                } else if (exampleOpt.name === 'user') {
                    usageText += ` @user`;
                } else {
                    usageText += ` ${exampleOpt.name}`;
                }
            }
            usageText += `\``;

            const usageDisplay = new TextDisplayBuilder()
                .setContent(usageText);

            const commandContainer = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator1)
                .addTextDisplayComponents(detailsDisplay)
                .addSeparatorComponents(separator2)
                .addTextDisplayComponents(usageDisplay);

            return loadingMsg.edit({
                components: [commandContainer],
                flags: MessageFlags.IsComponentsV2
            });
        }

        const categories = fs.readdirSync(commandsPath)
            .filter(file => fs.statSync(path.join(commandsPath, file)).isDirectory())
            .filter(folder => folder.toLowerCase() !== 'owner');

        const categoryData = {};
        for (const category of categories) {
            const categoryPath = path.join(commandsPath, category);
            const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

            categoryData[category] = [];
            for (const file of commandFiles) {
                const filePath = path.join(categoryPath, file);
                try {
                    const command = require(filePath);
                    if (command.name && command.description) {
                        categoryData[category].push({
                            name: command.name,
                            description: command.description,
                            emoji: command.emoji
                        });
                    }
                } catch (error) {
                    console.error(`Error loading command at ${filePath}:`, error);
                }
            }
        }

        // Generate home banner
        const homeBannerData = await generateCategoryBanner(client, 'Help Menu', '🏠');
        const attachmentName = 'help-banner.png';
        const attachment = new AttachmentBuilder(homeBannerData, { name: attachmentName });

        const gallery = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
        );

        const headerDisplay = new TextDisplayBuilder()
            .setContent(`### ${emoji.check} Shafed Billi Help\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const separator = new SeparatorBuilder();

        const descriptionText = `>>> **SHAFED BILLI**\n\nExperience high-fidelity audio streaming with advanced controls and seamless playback.\n\n**Select a category below to explore commands.**`;

        const descriptionDisplay = new TextDisplayBuilder()
            .setContent(descriptionText);

        const separator2 = new SeparatorBuilder();


        const categoryOptions = categories.map(cat => {
            const info = categoryInfo[cat] || { emoji: '📁', description: `${cat.toLowerCase()} commands` };
            return {
                label: cat,
                value: cat,
                description: info.description,
                emoji: info.emoji
            };
        });

        categoryOptions.unshift({
            label: 'Home',
            value: 'home',
            description: 'Go back to homepage',
            emoji: '<:home:1460242896786817087>'
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_menu')
            .setPlaceholder('Select a category...')
            .addOptions(categoryOptions);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const helpContainer = new ContainerBuilder()
            .addTextDisplayComponents(headerDisplay)
            .addSeparatorComponents(separator)
            .addMediaGalleryComponents(gallery)
            .addSeparatorComponents(separator)
            .addTextDisplayComponents(descriptionDisplay)
            .addSeparatorComponents(separator2)
            .addActionRowComponents(row);

        const sentMessage = await loadingMsg.edit({
            components: [helpContainer],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });

        const collector = sentMessage.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

        collector.on('collect', async interaction => {
            if (interaction.user.id !== message.author.id) {
                const errorDisplay = new TextDisplayBuilder()
                    .setContent(`**${emoji.cross} You can't use this menu.**`);

                const errorContainer = new ContainerBuilder()
                    .addTextDisplayComponents(errorDisplay);

                return interaction.reply({
                    components: [errorContainer],
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            const selectedValue = interaction.values[0];

            if (selectedValue === 'home') {
                await interaction.update({
                    components: [helpContainer],
                    files: [attachment],
                    flags: MessageFlags.IsComponentsV2
                });
                return;
            }

            const selectedCategory = selectedValue;
            const commandsList = categoryData[selectedCategory];
            const info = categoryInfo[selectedCategory] || { emoji: '📁', description: `${selectedCategory.toLowerCase()} commands` };

            // Generate category banner
            const categoryBannerData = await generateCategoryBanner(client, selectedCategory, info.emoji);
            const categoryAttachment = new AttachmentBuilder(categoryBannerData, { name: attachmentName });

            const categoryGallery = new MediaGalleryBuilder().addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
            );

            const categoryHeader = new TextDisplayBuilder()
                .setContent(`### ${emoji.check} ${selectedCategory} Commands\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

            const catSeparator = new SeparatorBuilder();

            const commandsText = commandsList.length > 0
                ? commandsList.map(cmd => `\`${cmd.name}\``).join(', ')
                : 'No commands found';

            const commandsDisplay = new TextDisplayBuilder()
                .setContent(commandsText);

            const catSeparator2 = new SeparatorBuilder();

            let serverPrefix = config.prefix || '.';
            try {
                const prefixData = await Prefix.findOne({ Guild: interaction.guild.id });
                if (prefixData && prefixData.Prefix) {
                    serverPrefix = prefixData.Prefix;
                }
            } catch (err) {
            }
            const tipText = `-# use \`${serverPrefix}help <cmd name>\` to get more details\n-# © Created by devrock`;
            const tipDisplay = new TextDisplayBuilder()
                .setContent(tipText);

            const categoryContainer = new ContainerBuilder()
                .addTextDisplayComponents(categoryHeader)
                .addSeparatorComponents(catSeparator)
                .addMediaGalleryComponents(categoryGallery)
                .addSeparatorComponents(catSeparator)
                .addTextDisplayComponents(commandsDisplay)
                .addSeparatorComponents(catSeparator2)
                .addTextDisplayComponents(tipDisplay)
                .addActionRowComponents(row);

            const updatePayload = {
                components: [categoryContainer],
                flags: MessageFlags.IsComponentsV2
            };
            if (categoryAttachment) updatePayload.files = [categoryAttachment];
            await interaction.update(updatePayload);
        });

        collector.on('end', () => {
            const timedOutMenu = new StringSelectMenuBuilder()
                .setCustomId('help_menu_disabled')
                .setPlaceholder('Help Menu timed out')
                .setDisabled(true)
                .addOptions([{
                    label: 'Expired',
                    value: 'expired'
                }]);

            const timedOutRow = new ActionRowBuilder().addComponents(timedOutMenu);

            const finalContainer = new ContainerBuilder()
                .addTextDisplayComponents(headerDisplay)
                .addSeparatorComponents(separator)
                .addTextDisplayComponents(descriptionDisplay)
                .addSeparatorComponents(separator2)
                .addActionRowComponents(timedOutRow);

            sentMessage.edit({ components: [finalContainer] }).catch(() => { });
        });
    }
};
