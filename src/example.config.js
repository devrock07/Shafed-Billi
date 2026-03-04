function parseBoolean(value) {
    if (typeof value === "string") {
        value = value.trim().toLowerCase();
    }
    switch (value) {
        case true:
        case "true":
            return true;
        default:
            return false;
    }
}

module.exports = {
    token: "BOT_TOKEN_HERE",
    prefix: ">",
    ownerID: ["OWNER_ID_HERE"],
    SpotifyID: "SPOTIFY_CLIENT_ID_HERE",
    SpotifySecret: "SPOTIFY_CLIENT_SECRET_HERE",
    mongourl: "MONGODB_CONNECTION_STRING_HERE",
    color: "#00D4FF",
    logs: "",
    node_source: "ytmsearch",

    links: {
        BG: "",
        support: "https://discord.gg/your-invite-code",
        invite: "https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID_HERE&permissions=8&scope=bot%20applications.commands",
        Shafed_Billa: "On Top??",
        power: "Powered By Kala Billa Development",
        vanity: "https://discord.gg/your-vanity-url",
        guild: "GUILD_ID_HERE",
    },

    Webhooks: {
        black: "WEBHOOK_URL_HERE",
        player_create: "WEBHOOK_URL_HERE",
        player_delete: "WEBHOOK_URL_HERE",
        guild_join: "WEBHOOK_URL_HERE",
        guild_leave: "WEBHOOK_URL_HERE",
        cmdrun: "WEBHOOK_URL_HERE",
    },

    nodes: [
        {
            name: "Node 1",
            url: "localhost:2333",
            auth: "youshallnotpass",
            secure: false
        }
    ],

    node_options: {
        moveOnDisconnect: false,
        resume: true,
        resumeTimeout: 60,
        resumeByLibrary: true,
        reconnectTries: 5,
        reconnectInterval: 5,
        restTimeout: 60000,
        voiceConnectionTimeout: 30000,
        userAgent: "Safed Billa",
    },
};
