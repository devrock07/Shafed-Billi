const fs = require("fs");
const path = require("path");
const { safeEventHandler } = require("../utils/safeEvent");

module.exports = (client) => {
  const clientEventsPath = path.join(__dirname, "../events/Client");
  let totalEvents = 0;

  fs.readdirSync(clientEventsPath).forEach((file) => {
    const event = require(path.join(clientEventsPath, file));
    const register = event.once ? "once" : "on";
    client[register](event.name, safeEventHandler(client, "Client", event));
    totalEvents++;
  });

  client.logger.log(`Client Events Loaded: ${totalEvents}`, "event");
};
