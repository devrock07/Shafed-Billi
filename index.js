// Early Warning Suppression
process.on('warning', (warning) => {
  if (warning.name === 'DeprecationWarning' && warning.message.includes('The ready event has been renamed to clientReady')) {
    return;
  }
});

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const { setGlobalDispatcher, Agent } = require("undici");
setGlobalDispatcher(new Agent({ connect: { timeout: 30_000 } }));

const MusicBot = require("./src/structures/MusicClient");
const initializeCleanup = require("./src/events/Client/PremiumChecks");
const Dokdo = require("dokdo");
const Logger = require("./src/utils/logger");

const client = new MusicBot();
module.exports = client;

client.connect();

client.Jsk = new Dokdo.Client(client, {
  aliases: ["dokdo", "dok", "jsk"],
  prefix: ['..'],
  owners: ['399625333617197057'],
});

process.env.SHELL = process.platform === "win32" ? "powershell" : "bash";

const emojis = require("./src/emojis");
client.emoji = emojis;

client.on("messageCreate", (message) => {
  client.Jsk.run(message);
});

// Improved Error Handling with Logger
process.on("unhandledRejection", (reason, p) => {
  // Filter known Lavalink/Undici timeouts to avoid log spam
  if (reason && (reason.code === 'UND_ERR_CONNECT_TIMEOUT' || (reason.message && reason.message.includes('fetch failed')))) {
    Logger.log("[Lavalink Error] Connection timeout or fetch failed. Node might be down.", "warn");
    return;
  }

  Logger.log(`[Unhandled Rejection] Reason: ${reason}`, "error");
  console.error(reason, p); // Keep console.error for stack trace details

  // Session Cleanup Logic
  if (reason && reason.message && reason.message.includes('Session not found')) {
    Logger.log("[Session Error] Lavalink session lost, attempting cleanup...", "warn");

    if (reason.path && typeof reason.path === 'string') {
      const guildIdMatch = reason.path.match(/\/players\/(\d+)/);
      if (guildIdMatch && guildIdMatch[1]) {
        const guildId = guildIdMatch[1];
        Logger.log(`[Session Error] Cleaning up player for guild ${guildId}`, "warn");

        try {
          if (client.manager && client.manager.players.has(guildId)) {
            client.manager.players.delete(guildId);
          }
          if (client.voiceHealthMonitor) {
            client.voiceHealthMonitor.stopMonitoring(guildId);
          }
        } catch (cleanupError) {
          Logger.log(`[Session Error] Cleanup failed: ${cleanupError}`, "error");
        }
      }
    }
  }
});

process.on("uncaughtException", (err, origin) => {
  Logger.log(`[Uncaught Exception] ${err}`, "error");
  console.error(origin, err);
});

process.on("uncaughtExceptionMonitor", (err, origin) => {
  Logger.log(`[Uncaught Exception Monitor] ${err}`, "error");
  console.error(origin, err);
});

initializeCleanup(client);