const { existsSync } = require("node:fs");
const { resolve } = require("node:path");

const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

const list = (value = "") => value.split(",").map((item) => item.trim()).filter(Boolean);
const boolean = (value, fallback = false) => {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
};

const config = {
  token: process.env.BOT_TOKEN || "",
  prefix: process.env.BOT_PREFIX || ".",
  ownerID: list(process.env.OWNER_IDS),
  SpotifyID: process.env.SPOTIFY_CLIENT_ID || "",
  SpotifySecret: process.env.SPOTIFY_CLIENT_SECRET || "",
  mongourl: process.env.MONGODB_URL || "",
  color: process.env.BOT_COLOR || "#3F4652",
  logs: process.env.LOG_LEVEL || "info",
  node_source: process.env.LAVALINK_SOURCE || "ytmsearch",

  links: {
    BG: process.env.BACKGROUND_URL || "",
    support: process.env.SUPPORT_URL || "",
    invite: process.env.INVITE_URL || "",
    Shafed_Billa: "Shafed Billi",
    power: "Developed by DEVROCK",
    vanity: process.env.VANITY_URL || "",
    guild: process.env.COMMUNITY_GUILD_ID || "",
  },

  Webhooks: {
    black: process.env.BLACKLIST_WEBHOOK_URL || "",
    player_create: process.env.PLAYER_CREATE_WEBHOOK_URL || "",
    player_delete: process.env.PLAYER_DELETE_WEBHOOK_URL || "",
    guild_join: process.env.GUILD_JOIN_WEBHOOK_URL || "",
    guild_leave: process.env.GUILD_LEAVE_WEBHOOK_URL || "",
    cmdrun: process.env.COMMAND_WEBHOOK_URL || "",
  },

  nodes: [{
    name: process.env.LAVALINK_NAME || "Primary",
    url: process.env.LAVALINK_URL || "89.106.84.111:25571",
    auth: process.env.LAVALINK_PASSWORD || "youshallnotpass",
    secure: boolean(process.env.LAVALINK_SECURE),
  }],

  node_options: {
    moveOnDisconnect: false,
    resume: true,
    resumeTimeout: 60,
    resumeByLibrary: true,
    reconnectTries: 5,
    reconnectInterval: 5,
    restTimeout: 60_000,
    voiceConnectionTimeout: 30_000,
    userAgent: "Shafed Billi",
  },
};

config.validate = () => {
  const missing = [];
  if (!config.token) missing.push("BOT_TOKEN");
  if (!config.mongourl) missing.push("MONGODB_URL");
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}. Copy .env.example to .env and fill in the values.`);
  }
};

module.exports = config;
