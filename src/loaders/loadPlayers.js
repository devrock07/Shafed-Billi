const fs = require("fs");
const path = require("path");
const { safeEventHandler } = require("../utils/safeEvent");

module.exports = (client) => {
  const playersPath = path.join(__dirname, "../events/Players");
  let totalEvents = 0;

  if (fs.existsSync(playersPath)) {
    fs.readdirSync(playersPath).forEach((file) => {
      const event = require(path.join(playersPath, file));
      const register = event.once ? "once" : "on";
      client.manager[register](event.name, safeEventHandler(client, "Player", event));
      totalEvents++;
    });
  }

  client.logger.log(`Player Events Loaded: ${totalEvents}`, "event");
};
