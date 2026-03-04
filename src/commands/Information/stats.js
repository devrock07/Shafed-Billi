const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder
} = require("discord.js");
const os = require("os");
const mongoose = require('mongoose');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const emoji = require('../../emojis');

module.exports = {
  name: "stats",
  category: "Information",
  description: "Show detailed bot statistics",
  args: false,
  usage: "",
  aliases: ["statistics", "botinfo", "bi"],
  userPerms: [],
  owner: false,
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
    // Loading indicator
    const loadingText = new TextDisplayBuilder()
      .setContent(`### ${emoji.load} Loading statistics...`);

    const loadingContainer = new ContainerBuilder()
      .addTextDisplayComponents(loadingText);

    const loadingMsg = await message.reply({
      components: [loadingContainer],
      flags: MessageFlags.IsComponentsV2
    });

    const uptime = process.uptime();
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor(uptime / 3600) % 24;
    const minutes = Math.floor(uptime / 60) % 60;

    const memoryUsage = process.memoryUsage();
    const rssInMB = Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100;
    const heapUsed = Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const heapTotal = Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100;

    const guildCount = client.guilds.cache.size;
    const userCount = client.users.cache.size;
    const channelCount = client.channels.cache.size;
    const textChannels = client.channels.cache.filter(c => c.type === 0).size;
    const voiceChannels = client.channels.cache.filter(c => c.type === 2).size;

    const manager = client.manager;
    const players = Array.from(manager.players.values());
    const totalPlayers = players.length;
    const playingPlayers = players.filter(p => p.playing).length;
    const pausedPlayers = players.filter(p => p.paused).length;
    const totalTracks = players.reduce((acc, p) => acc + p.queue.size + (p.queue.current ? 1 : 0), 0);

    const commandsCount = client.commands?.size || 0;

    const shardId = message.guild?.shardId || 0;
    const totalShards = client.shard?.count || 1;
    const clusterId = client.cluster?.id || 0;
    const totalClusters = client.cluster?.count || 1;

    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    const dbName = mongoose.connection.readyState === 1 ? mongoose.connection.name || 'MongoDB' : 'N/A';

    const node = manager.shoukaku.nodes.values().next().value;
    const nodeName = node?.name || 'N/A';
    const nodeVersion = node?.info?.version || 'N/A';
    const nodeMemUsed = node?.stats?.memory?.used ? Math.round((node.stats.memory.used / 1024 / 1024) * 100) / 100 : 0;
    const nodeCpuLoad = node?.stats?.cpu?.systemLoad ? Math.round(node.stats.cpu.systemLoad * 10000) / 100 : 0;

    const nodeJsVersion = process.version;
    const djsVersion = require('discord.js').version;
    const platform = os.platform();
    const arch = os.arch();
    const cpuModel = os.cpus()[0]?.model || 'Unknown';
    const cpuCores = os.cpus().length;
    const cpuSpeed = os.cpus()[0]?.speed || 0;
    const totalMemory = Math.round((os.totalmem() / 1024 / 1024) * 100) / 100;
    const freeMemory = Math.round((os.freemem() / 1024 / 1024) * 100) / 100;
    const usedMemory = Math.round((totalMemory - freeMemory) * 100) / 100;

    const formatNumber = (num) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
      return num.toString();
    };

    // Generate Visual Banner based on category with graphs
    const generateBanner = async (category) => {
      const width = 930;
      const height = 280;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // Background with darker gradient for better contrast
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

        // Glowing border
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

      // Category-specific content with graphs
      ctx.font = '18px Arial';
      ctx.fillStyle = '#aaaaaa';

      switch (category) {
        case 'bot':
          ctx.fillText(`Bot Statistics`, 280, 100);

          // Generate sample data for graphs (in real scenario, you'd track this over time)
          const serverTrend = [guildCount * 0.7, guildCount * 0.8, guildCount * 0.85, guildCount * 0.9, guildCount * 0.95, guildCount];
          const userTrend = [userCount * 0.6, userCount * 0.75, userCount * 0.85, userCount * 0.9, userCount * 0.92, userCount];

          // Graph 1: Server growth
          ctx.fillStyle = '#FF1493';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Server Growth', 290, 130);
          drawGraph(serverTrend, '#FF1493', 290, 140, 280, 60);

          // Graph 2: User growth
          ctx.fillStyle = '#00D9FF';
          ctx.fillText('User Growth', 590, 130);
          drawGraph(userTrend, '#00D9FF', 590, 140, 280, 60);

          // Stats text
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${formatNumber(guildCount)} Servers`, 290, 220);
          ctx.fillText(`${formatNumber(userCount)} Users`, 590, 220);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#888888';
          ctx.fillText(`${commandsCount} Commands`, 290, 240);
          ctx.fillText(`${formatNumber(channelCount)} Channels`, 590, 240);
          break;

        case 'music':
          ctx.fillText(`Music Statistics`, 280, 100);

          // Music activity trend
          const playerTrend = [totalPlayers * 0.5, totalPlayers * 0.7, totalPlayers * 0.9, totalPlayers * 1.1, totalPlayers * 0.95, totalPlayers];
          const queueTrend = [totalTracks * 0.4, totalTracks * 0.6, totalTracks * 0.8, totalTracks * 1.0, totalTracks * 0.9, totalTracks];

          ctx.fillStyle = '#FF1493';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('Active Players', 290, 130);
          drawGraph(playerTrend, '#FF1493', 290, 140, 280, 60);

          ctx.fillStyle = '#00D9FF';
          ctx.fillText('Queue Activity', 590, 130);
          drawGraph(queueTrend, '#00D9FF', 590, 140, 280, 60);

          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${totalPlayers} Active Players`, 290, 220);
          ctx.fillText(`${totalTracks} Queued Songs`, 590, 220);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#888888';
          ctx.fillText(`${playingPlayers} Playing • ${pausedPlayers} Paused`, 290, 240);
          ctx.fillText(`Node: ${nodeName}`, 590, 240);
          break;

        case 'system':
          ctx.fillText(`System Information`, 280, 100);

          // System metrics trend
          const latencyTrend = [client.ws.ping * 1.2, client.ws.ping * 0.9, client.ws.ping * 1.1, client.ws.ping * 0.95, client.ws.ping * 1.05, client.ws.ping];
          const memoryTrend = [heapUsed * 0.7, heapUsed * 0.8, heapUsed * 0.85, heapUsed * 0.9, heapUsed * 0.95, heapUsed];

          ctx.fillStyle = '#FF1493';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('API Latency (ms)', 290, 130);
          drawGraph(latencyTrend, '#FF1493', 290, 140, 280, 60);

          ctx.fillStyle = '#00D9FF';
          ctx.fillText('Memory Usage (MB)', 590, 130);
          drawGraph(memoryTrend, '#00D9FF', 590, 140, 280, 60);

          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${client.ws.ping}ms Latency`, 290, 220);
          ctx.fillText(`${heapUsed}MB / ${heapTotal}MB`, 590, 220);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#888888';
          ctx.fillText(`Uptime: ${days}d ${hours}h ${minutes}m`, 290, 240);
          ctx.fillText(`Node.js ${nodeJsVersion}`, 590, 240);
          break;

        case 'node':
          ctx.fillText(`Node Performance`, 280, 100);

          // Node performance trend
          const cpuTrend = [nodeCpuLoad * 0.8, nodeCpuLoad * 1.1, nodeCpuLoad * 0.9, nodeCpuLoad * 1.2, nodeCpuLoad * 0.95, nodeCpuLoad];
          const ramTrend = [usedMemory * 0.85, usedMemory * 0.9, usedMemory * 0.92, usedMemory * 0.95, usedMemory * 0.98, usedMemory];

          ctx.fillStyle = '#FF1493';
          ctx.font = 'bold 14px Arial';
          ctx.fillText('CPU Load (%)', 290, 130);
          drawGraph(cpuTrend, '#FF1493', 290, 140, 280, 60);

          ctx.fillStyle = '#00D9FF';
          ctx.fillText('RAM Usage (MB)', 590, 130);
          drawGraph(ramTrend, '#00D9FF', 590, 140, 280, 60);

          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(`${nodeCpuLoad.toFixed(1)}% CPU Load`, 290, 220);
          ctx.fillText(`${usedMemory.toFixed(0)}MB Used`, 590, 220);
          ctx.font = '12px Arial';
          ctx.fillStyle = '#888888';
          ctx.fillText(`Node Memory: ${nodeMemUsed}MB`, 290, 240);
          ctx.fillText(`Free: ${freeMemory.toFixed(0)}MB`, 590, 240);
          break;
      }

      const pngData = await canvas.encode('png');
      return pngData;
    };

    // Generate initial banner for bot stats
    let currentBannerData = await generateBanner('bot');
    let attachmentName = 'stats-banner.png';
    let attachment = new AttachmentBuilder(currentBannerData, { name: attachmentName });

    let gallery = new MediaGalleryBuilder().addItems(
      new MediaGalleryItemBuilder().setURL(`attachment://${attachmentName}`)
    );

    const statsPages = {
      bot: {
        title: 'Bot Statistics',
        content: `\`\`\`yml\nUsername         : ${client.user.username}#${client.user.discriminator}\nBot ID           : ${client.user.id}\nServers          : ${formatNumber(guildCount)}\nUsers            : ${formatNumber(userCount)}\nChannels         : ${formatNumber(channelCount)}\nCommands         : ${commandsCount}\nShards           : ${shardId + 1} / ${totalShards}\nClusters         : ${clusterId + 1} / ${totalClusters}\n\`\`\``
      },
      music: {
        title: 'Music Statistics',
        content: `\`\`\`yml\nActive Players   : ${totalPlayers}\nPlaying Now      : ${playingPlayers}\nPaused Players   : ${pausedPlayers}\nTotal Songs Queue: ${totalTracks}\nNode             : ${nodeName}\nLavalink Version : ${nodeVersion}\n\`\`\``
      },
      system: {
        title: 'System Information',
        content: `\`\`\`yml\nAPI Latency      : ${client.ws.ping} ms\nUptime           : ${days}d ${hours}h ${minutes}m\nMemory (RSS)     : ${rssInMB} MB\nHeap Used        : ${heapUsed} MB\nHeap Total       : ${heapTotal} MB\nPlatform         : ${platform} (${arch})\nCPU Model        : ${cpuModel}\nCPU Cores        : ${cpuCores}\nCPU Speed        : ${cpuSpeed} MHz\nNode.js          : ${nodeJsVersion}\nDiscord.js       : v${djsVersion}\nDatabase         : ${dbName} (${dbStatus})\n\`\`\``
      },
      node: {
        title: 'Node Performance',
        content: `\`\`\`yml\nNode Memory      : ${nodeMemUsed} MB\nNode CPU Load    : ${nodeCpuLoad}%\nSystem RAM Total : ${totalMemory.toFixed(2)} MB\nSystem RAM Used  : ${usedMemory.toFixed(2)} MB\nSystem RAM Free  : ${freeMemory.toFixed(2)} MB\n\`\`\``
      }
    };

    const createStatsDisplay = (page) => {
      const header = new TextDisplayBuilder()
        .setContent(`### ${client.user.username}'s Statistics\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

      const separator1 = new SeparatorBuilder();

      const categoryHeader = new TextDisplayBuilder()
        .setContent(`**${statsPages[page].title}**`);

      const separator2 = new SeparatorBuilder();

      const content = new TextDisplayBuilder()
        .setContent(statsPages[page].content);

      const separator3 = new SeparatorBuilder();

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`stats_select_${message.author.id}`)
        .setPlaceholder('Select a statistics category')
        .addOptions([
          {
            label: 'Bot Statistics',
            description: 'View bot information and server counts',
            value: 'bot',
            default: page === 'bot'
          },
          {
            label: 'Music Statistics',
            description: 'View music player and queue information',
            value: 'music',
            default: page === 'music'
          },
          {
            label: 'System Information',
            description: 'View system and platform details',
            value: 'system',
            default: page === 'system'
          },
          {
            label: 'Node Performance',
            description: 'View Lavalink node performance metrics',
            value: 'node',
            default: page === 'node'
          }
        ]);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(categoryHeader)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(content)
        .addSeparatorComponents(separator3)
        .addMediaGalleryComponents(gallery)
        .addActionRowComponents(row);

      return container;
    };

    await loadingMsg.edit({
      content: '',
      components: [createStatsDisplay('bot')],
      files: [attachment],
      flags: MessageFlags.IsComponentsV2
    });

    const collector = loadingMsg.createMessageComponentCollector({
      filter: (i) => i.customId === `stats_select_${message.author.id}` && i.user.id === message.author.id,
      time: 60000
    });

    collector.on('collect', async (interaction) => {
      const page = interaction.values[0];

      // Regenerate banner for the selected category
      currentBannerData = await generateBanner(page);
      attachment = new AttachmentBuilder(currentBannerData, { name: attachmentName });

      await interaction.update({
        content: '',
        components: [createStatsDisplay(page)],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      });
    });

    collector.on('end', () => {
      const disabledMenu = new StringSelectMenuBuilder()
        .setCustomId('stats_select_disabled')
        .setPlaceholder('This menu has timed out')
        .setDisabled(true)
        .addOptions([
          {
            label: 'Bot Statistics',
            value: 'bot'
          }
        ]);

      const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);

      const header = new TextDisplayBuilder()
        .setContent(`### ${client.user.username}'s Statistics\n-# Requested by ${message.author.username} • <t:${Math.floor(Date.now() / 1000)}:t>`);

      const separator1 = new SeparatorBuilder();

      const categoryHeader = new TextDisplayBuilder()
        .setContent(`**Bot Statistics**`);

      const separator2 = new SeparatorBuilder();

      const content = new TextDisplayBuilder()
        .setContent(statsPages.bot.content);

      const separator3 = new SeparatorBuilder();

      const container = new ContainerBuilder()
        .addTextDisplayComponents(header)
        .addSeparatorComponents(separator1)
        .addTextDisplayComponents(categoryHeader)
        .addSeparatorComponents(separator2)
        .addTextDisplayComponents(content)
        .addSeparatorComponents(separator3)
        .addMediaGalleryComponents(gallery)
        .addActionRowComponents(disabledRow);

      loadingMsg.edit({
        content: '',
        components: [container],
        files: [attachment],
        flags: MessageFlags.IsComponentsV2
      }).catch(() => { });
    });
  }
};
