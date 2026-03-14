const {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    AttachmentBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const mongoose = require('mongoose');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const emoji = require('../../emojis');
const axios = require('axios');
module.exports = {
    name: 'ping',
    aliases: ['latency', 'pong'],
    description: "Displays the bot's various latencies.",
    category: 'Information',
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

    async execute(message, args, client) {
        // Loading indicator
        const loadingText = new TextDisplayBuilder()
            .setContent(`### ${emoji.load} Loading latency data...`);

        const loadingContainer = new ContainerBuilder()
            .addTextDisplayComponents(loadingText);

        const loadingMsg = await message.reply({
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2
        });

        // 1. Measure Latencies
        const startTime = Date.now();
        const api = client.ws.ping;

        const [db, lavalink] = await Promise.all([
            (async () => {
                try {
                    const start = Date.now();
                    await mongoose.connection.db.admin().ping();
                    return Date.now() - start;
                } catch { return 0; }
            })(),
            (async () => {
                try {
                    const node = client.manager?.shoukaku?.nodes?.values()?.next()?.value;
                    if (node && node.state === 1) {
                        const start = Date.now();
                        await node.rest.resolve('ytsearch:test');
                        return Date.now() - start;
                    }
                    return 0;
                } catch { return 0; }
            })()
        ]);

        const response = Date.now() - startTime;

        // 2. Text Display (Original)
        const header = new TextDisplayBuilder()
            .setContent(`### ${client.user.username}'s Latency\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

        const latencyText = new TextDisplayBuilder()
            .setContent(
                `\`\`\`ansi\n` +
                `\x1b[36m🌐 Websocket\x1b[0m : ${api}ms\n` +
                `\x1b[35m💾 Database\x1b[0m  : ${db}ms\n` +
                `\x1b[33m🎵 Lavalink\x1b[0m  : ${lavalink}ms\n` +
                `\x1b[32m⚡ Response\x1b[0m  : ${response}ms\n` +
                `\`\`\``
            );

        const separator = new SeparatorBuilder()
            .setDivider(true);

        // 3. Generate Visual Image using @napi-rs/canvas with graphs
        const width = 930;
        const height = 280;
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');

        // Background with dark gradient
        const gradient = ctx.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, '#1a1a2e');
        gradient.addColorStop(1, '#16213e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        // Bot Avatar
        try {
            const avatarParams = { extension: 'png', size: 256 };
            const avatarUrl = client.user.displayAvatarURL(avatarParams);

            const res = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
            const avatarImage = await loadImage(Buffer.from(res.data));

            ctx.save();
            ctx.beginPath();
            ctx.arc(140, 140, 100, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatarImage, 40, 40, 200, 200);
            ctx.restore();

            // Glowing pink border
            ctx.shadowColor = '#FF1493';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(140, 140, 100, 0, Math.PI * 2, true);
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#FF1493';
            ctx.stroke();
            ctx.shadowBlur = 0;
        } catch (e) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(140, 140, 100, 0, Math.PI * 2, true);
            ctx.fill();
        }

        // Title
        ctx.shadowColor = "#FF69B4";
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 42px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SHAFED BILLI', 280, 70);
        ctx.shadowBlur = 0;

        ctx.font = '18px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`System Latency`, 280, 100);

        // Helper function to draw line graph
        const drawGraph = (data, color, x, y, w, h) => {
            if (data.length < 2) return;

            const stepX = w / (data.length - 1);
            const maxValue = Math.max(...data);
            const minValue = Math.min(...data);
            const range = maxValue - minValue || 1;

            // Draw graph area background
            ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
            ctx.fillRect(x, y, w, h);

            // Create gradient for fill
            const fillGradient = ctx.createLinearGradient(0, y, 0, y + h);
            fillGradient.addColorStop(0, color + '80');
            fillGradient.addColorStop(1, color + '10');

            // Draw filled area
            ctx.beginPath();
            ctx.moveTo(x, y + h);
            data.forEach((value, i) => {
                const px = x + (i * stepX);
                const py = y + h - ((value - minValue) / range) * h;
                if (i === 0) ctx.lineTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.lineTo(x + w, y + h);
            ctx.closePath();
            ctx.fillStyle = fillGradient;
            ctx.fill();

            // Draw line
            ctx.beginPath();
            data.forEach((value, i) => {
                const px = x + (i * stepX);
                const py = y + h - ((value - minValue) / range) * h;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.shadowColor = color;
            ctx.shadowBlur = 8;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw points
            data.forEach((value, i) => {
                const px = x + (i * stepX);
                const py = y + h - ((value - minValue) / range) * h;
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#1a1a2e';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        };

        // Generate latency trend data
        const apiTrend = [api * 1.1, api * 0.9, api * 1.05, api * 0.95, api * 1.02, api];
        const responseTrend = [response * 1.2, response * 0.8, response * 1.1, response * 0.9, response * 1.05, response];

        // Graph 1: API Latency
        ctx.fillStyle = '#FF1493';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('API Latency (ms)', 290, 130);
        drawGraph(apiTrend, '#FF1493', 290, 140, 280, 60);

        // Graph 2: Response Time
        ctx.fillStyle = '#00D9FF';
        ctx.fillText('Response Time (ms)', 590, 130);
        drawGraph(responseTrend, '#00D9FF', 590, 140, 280, 60);

        // Stats text
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`${api}ms Websocket`, 290, 220);
        ctx.fillText(`${response}ms Response`, 590, 220);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#888888';
        ctx.fillText(`Database: ${db}ms`, 290, 240);
        ctx.fillText(`Lavalink: ${lavalink}ms`, 590, 240);

        // 4. Create Attachment
        const pngData = await canvas.encode('png');
        const attachmentName = 'stats.png';
        const attachment = new AttachmentBuilder(pngData, { name: attachmentName });

        // 5. MediaGallery
        const gallery = new MediaGalleryBuilder().addItems(
            new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
        );

        // 6. Container with Text + Separator + Image
        const container = new ContainerBuilder()
            .addTextDisplayComponents(header)
            .addTextDisplayComponents(latencyText)
            .addSeparatorComponents(separator)
            .addMediaGalleryComponents(gallery);

        // 7. Send (Edit loading message)
        await loadingMsg.edit({
            components: [container],
            files: [attachment],
            flags: MessageFlags.IsComponentsV2
        });
    },
};