async function safeDestroyPlayer(player) {
    if (!player) return;

    try {
        await player.destroy();
    } catch (error) {
        if (error.status === 404) {
            console.log(`Player already destroyed or session not found for guild ${player.guildId}`);
        } else {
            console.error(`Error destroying player for guild ${player.guildId}:`, error);
        }
    }
}

async function handleSessionError(error, player, client) {
    if (error.status === 404 && error.message && error.message.includes('Session not found')) {
        console.log(`Session lost for guild ${player.guildId}, cleaning up...`);

        try {
            if (client.manager.players.has(player.guildId)) {
                client.manager.players.delete(player.guildId);
            }
        } catch (cleanupError) {
            console.error(`Error during session cleanup:`, cleanupError);
        }

        return true;
    }
    return false;
}

async function recreatePlayer(client, guildId, voiceId, textId) {
    try {
        if (client.manager.players.has(guildId)) {
            client.manager.players.delete(guildId);
        }

        const newPlayer = await client.manager.createPlayer({
            guildId: guildId,
            voiceId: voiceId,
            textId: textId,
            volume: 80,
            deaf: true,
        });

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (!newPlayer || !client.manager.players.get(guildId)) {
            throw new Error("Failed to recreate player - connection timeout");
        }

        return newPlayer;
    } catch (error) {
        console.error(`Error recreating player:`, error);
        throw error;
    }
}

async function attemptAutoplay(client, player) {
    try {
        if (!player) return;
        const autoplay = player.data?.get("autoplay");
        if (!autoplay) return;
        const loopMode = (player.loop || "none").toString().toLowerCase();
        if (loopMode === "track" || loopMode === "queue") {
            client.logger?.log(`[Autoplay] Skipping autoplay due to loop mode "${loopMode}" in guild ${player.guildId}`, "debug");
            return;
        }
        if (player.queue?.size > 0) return;
        if (player.playing || player.paused) return;
        if (player.data?.get("autoplayInProgress")) return;

        player.data?.set("autoplayInProgress", true);

        const lastTrack = player.data?.get("lastTrack") || null;
        if (!lastTrack || !lastTrack.title) {
            player.data?.delete("autoplayInProgress");
            return;
        }

        const normalize = (str) => (str || "")
            .toLowerCase()
            .replace(/\s*-\s*topic\s*$/gi, "")
            .replace(/\(.*?(official|audio|video|lyrics).*?\)/gi, "")
            .replace(/\[.*?(official|audio|video|lyrics).*?\]/gi, "")
            .replace(/official|audio|video|lyrics|hd|4k|remastered|mv/gi, "")
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const extractYouTubeId = (uri) => {
            if (!uri) return null;
            const m = uri.match(/(?:v=|\/vi?\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
        };

        const isSameTrack = (a, b) => {
            try {
                if (!a || !b) return false;
                if (a.identifier && b.identifier && a.identifier === b.identifier) return true;
                const aId = extractYouTubeId(a.uri);
                const bId = extractYouTubeId(b.uri);
                if (aId && bId && aId === bId) return true;
                const at = normalize(a.title);
                const bt = normalize(b.title);
                const aa = normalize(a.author);
                const ba = normalize(b.author);
                if (at && bt && at === bt && aa && ba && aa === ba) {
                    const aLen = Number(a.length || 0);
                    const bLen = Number(b.length || 0);
                    if (Math.abs(aLen - bLen) <= 2000) return true;
                }
            } catch { }
            return false;
        };

        const recentKey = "recentAutoplayIds";
        const recent = player.data?.get(recentKey) || [];
        const remember = (t) => {
            const next = Array.from(new Set([t.identifier || extractYouTubeId(t.uri) || t.uri, ...recent])).filter(Boolean).slice(0, 5);
            player.data?.set(recentKey, next);
        };

        const cleanAuthor = (author) => {
            if (!author) return "";
            return author.replace(/\s*-\s*Topic\s*$/i, "").trim();
        };

        const query = `${lastTrack.title} ${cleanAuthor(lastTrack.author)}`.trim();
        const engines = ["ytmsearch", "ytsearch", "spsearch", "amsearch", "dzsearch", "jssearch"];

        let foundTrack = null;
        for (const engine of engines) {
            try {
                const res = await player.search(query, {
                    engine,
                    requester: lastTrack.requester || client.user
                });
                const tracks = res?.tracks || [];
                if (tracks.length > 0) {
                    foundTrack = tracks.find(t =>
                        !isSameTrack(lastTrack, t) &&
                        !(recent || []).includes(t.identifier || extractYouTubeId(t.uri) || t.uri)
                    ) || null;
                    if (!foundTrack) {
                        // Fallback to any track that's not exactly the same title+author even if identifier differs
                        for (const t of tracks) {
                            if (!isSameTrack(lastTrack, t)) {
                                foundTrack = t;
                                break;
                            }
                        }
                    }
                    if (foundTrack) {
                        player.data?.set("lastAutoplaySource", engine);
                        break;
                    }
                }
            } catch (e) {
                // Continue to next engine
                continue;
            }
        }

        if (!foundTrack) {
            client.logger?.log(`[Autoplay] No related tracks found for "${lastTrack.title}" in guild ${player.guildId}`, "debug");
            player.data?.delete("autoplayInProgress");
            return;
        }

        player.queue.add(foundTrack);
        remember(foundTrack);
        client.logger?.log(`[Autoplay] Queued "${foundTrack.title}" (source: ${player.data?.get("lastAutoplaySource") || "unknown"}) in guild ${player.guildId}`, "log");

        if (!player.playing && !player.paused) {
            try {
                await player.play();
            } catch (playErr) {
                client.logger?.log(`[Autoplay] Failed to start playback: ${playErr.message}`, "error");
            }
        }
    } catch (err) {
        client.logger?.log(`[Autoplay] Error: ${err.message}`, "error");
    } finally {
        try {
            player?.data?.delete("autoplayInProgress");
        } catch {}
    }
}

async function applyQualityFilters(player, quality) {
    try {
        if (!player) return;
        
        if (quality === "premium") {
            // High-fidelity boost for premium users - CLEAR ALL FILTERS
            const eq = [
                { band: 0, gain: 0.12 },
                { band: 1, gain: 0.08 },
                { band: 2, gain: 0.04 },
                { band: 3, gain: 0.00 },
                { band: 4, gain: 0.00 },
                { band: 5, gain: 0.00 },
                { band: 6, gain: 0.00 },
                { band: 7, gain: 0.00 },
                { band: 8, gain: 0.00 },
                { band: 9, gain: 0.00 },
                { band: 10, gain: 0.02 },
                { band: 11, gain: 0.05 },
                { band: 12, gain: 0.08 },
                { band: 13, gain: 0.10 },
                { band: 14, gain: 0.12 }
            ];
            await player.shoukaku.setFilters({ 
                equalizer: eq,
                timescale: null,
                tremolo: null,
                vibrato: null,
                rotation: null,
                distortion: null,
                karaoke: null,
                lowPass: null,
                channelMix: null
            });
        } else {
            // Intentionally "noticeably lower quality" (about 30% different) for non-premium users
            // 1. "Low Fidelity" EQ (Slightly muffled highs, boosted mids, cut bass)
            const badEq = [
                { band: 0, gain: -0.20 },
                { band: 1, gain: -0.20 },
                { band: 2, gain: -0.15 },
                { band: 3, gain: -0.10 },
                { band: 4, gain: 0.05 },
                { band: 5, gain: 0.15 },  // Boost mid for "tinny" sound
                { band: 6, gain: 0.20 },
                { band: 7, gain: 0.20 },
                { band: 8, gain: 0.15 },
                { band: 9, gain: -0.10 },
                { band: 10, gain: -0.15 },
                { band: 11, gain: -0.20 },
                { band: 12, gain: -0.25 },
                { band: 13, gain: -0.30 },
                { band: 14, gain: -0.35 }
            ];

            // 2. Slightly slower speed and lower pitch (Noticeable but easy to understand)
            const timescale = {
                speed: 0.88,   // Slower
                pitch: 0.92,   // Lower pitch (makes it feel "heavy")
                rate: 1.0
            };

            // 3. Subtle Vibrato (Small "pitch wobble")
            const vibrato = {
                frequency: 1.5,
                depth: 0.2
            };

            // 4. Subtle Tremolo (Small "volume pulse")
            const tremolo = {
                frequency: 2.0,
                depth: 0.2
            };

            // 5. Very slow Rotation (Slowly moves between ears)
            const rotation = {
                rotationHz: 0.15
            };

            await player.shoukaku.setFilters({ 
                equalizer: badEq,
                timescale: timescale,
                vibrato: vibrato,
                tremolo: tremolo,
                rotation: rotation,
                lowPass: null,
                distortion: null
            });
        }
    } catch (error) {
        console.error("Error applying quality filters:", error);
    }
}

module.exports = { safeDestroyPlayer, handleSessionError, recreatePlayer, attemptAutoplay, applyQualityFilters };
