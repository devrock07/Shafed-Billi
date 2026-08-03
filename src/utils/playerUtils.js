const {
    buildAutoplaySearches,
    rememberTracks,
    selectAutoplayCandidate,
} = require("./autoplay");

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

        const recentKey = "recentAutoplayIds";
        const history = (player.data?.get("history") || []).slice(-10);
        let recent = rememberTracks(player.data?.get(recentKey) || [], [lastTrack, ...history]);
        player.data?.set(recentKey, recent);

        let foundTrack = null;
        for (const [engine, query] of buildAutoplaySearches(lastTrack)) {
            try {
                const res = await player.search(query, {
                    engine,
                    requester: lastTrack.requester || client.user
                });
                foundTrack = selectAutoplayCandidate(lastTrack, res?.tracks || [], recent);
                if (foundTrack) {
                    player.data?.set("lastAutoplaySource", engine);
                    player.data?.set("lastAutoplayQuery", query);
                    break;
                }
            } catch { }
        }

        if (!foundTrack) {
            client.logger?.log(`[Autoplay] No related tracks found for "${lastTrack.title}" in guild ${player.guildId}`, "debug");
            player.data?.delete("autoplayInProgress");
            return;
        }

        player.queue.add(foundTrack);
        recent = rememberTracks(recent, [foundTrack]);
        player.data?.set(recentKey, recent);
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

module.exports = { safeDestroyPlayer, handleSessionError, recreatePlayer, attemptAutoplay };
