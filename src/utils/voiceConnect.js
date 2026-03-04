const { EmbedBuilder } = require('discord.js');
const VoiceStatus = require("../schema/vcstatus");

async function updateVoiceChannel(client, player, restore = false) {
    try {
        const vcStatus = await VoiceStatus.findOne({ guildId: player.guildId });
        if (!vcStatus) return;

        const channel = client.channels.cache.get(player.voiceId);
        if (!channel || !channel.manageable) return;

        if (restore) {
            const defaultName = channel.name.replace(/🎵\s*.*$/, '').trim();
            await channel.setName(defaultName);
        } else {
            return;
        }
    } catch (error) {
        console.error('Error updating voice channel:', error);
    }
}

module.exports = {
    connectToVoice: async function(player, message, client) {
    try {
        const TwoFourSeven = require("../schema/247");
        const is247 = await TwoFourSeven.findOne({ Guild: message.guild.id });

        if (player.connected && player.voiceId === message.member.voice.channel.id) {
            return true;
        }

        if (player.connected && player.voiceId !== message.member.voice.channel.id) {
            if (is247) {
                throw new Error('Bot is in 24/7 mode. Please join the bot\'s voice channel');
            } else {
                await player.setVoiceChannel(message.member.voice.channel.id);
                return true;
            }
        }

        // Not connected, try to connect
        if (!player.connected) {
            try {
                await player.connect();
                
                if (is247) {
                    await TwoFourSeven.findOneAndUpdate(
                        { Guild: message.guild.id },
                        {
                            TextId: message.channel.id,
                            VoiceId: message.member.voice.channel.id
                        },
                        { upsert: true }
                    );
                }
            } catch (err) {
                console.error('Connection error:', err);
                throw new Error('Failed to establish connection');
            }
        }

        // Verify connection
        if (!player.connected) {
            throw new Error('Failed to establish connection');
        }

        return true;
    } catch (error) {
        console.error('Voice connection error:', error);
        
        await message.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor(client.color)
                    .setDescription(`-# **${client.emoji.cross} ${error.message}**`)
            ]
        });
        
        throw error; // Rethrow for the calling function to handle
    }
},
    updateVoiceChannel
}