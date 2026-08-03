const mongoose = require("mongoose");
const { ContainerBuilder, MessageFlags, TextDisplayBuilder } = require("discord.js");
const Noprefix = require("../schema/noprefix");

async function cleanExpiredAccess(client) {
  if (mongoose.connection.readyState !== 1) return;

  try {
    const expired = await Noprefix.find({ expiresAt: { $lt: new Date() } })
      .maxTimeMS(5_000)
      .lean();
    if (!expired.length) return;

    await Noprefix.deleteMany({ _id: { $in: expired.map((entry) => entry._id) } });
    for (const userId of new Set(expired.map((entry) => entry.userId))) {
      try {
        const user = await client.users.fetch(userId);
        const notice = new ContainerBuilder().addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `**${client.emoji.info} Your global no-prefix access has expired.**\n` +
            "Use the server prefix for commands, or contact the bot owner if access should be renewed.",
          ),
        );
        await user.send({ components: [notice], flags: MessageFlags.IsComponentsV2 });
      } catch { }
    }
  } catch (error) {
    const transient = error.name === "MongoNetworkTimeoutError" || error.name === "MongoTimeoutError";
    client.logger?.log(
      transient ? "[Access cleanup] MongoDB timeout; retrying next cycle." : `[Access cleanup] ${error.message}`,
      transient ? "warn" : "error",
    );
  }
}

let cleanupInitialized = false;

function initializeAccessCleanup(client) {
  if (cleanupInitialized) return;
  cleanupInitialized = true;
  const timer = setInterval(() => cleanExpiredAccess(client), 60_000);
  timer.unref?.();
}

module.exports = initializeAccessCleanup;
module.exports.cleanExpiredAccess = cleanExpiredAccess;
