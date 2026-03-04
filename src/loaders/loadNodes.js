const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const nodesPath = path.join(__dirname, "../events/Node");
  let totalEvents = 0;

  if (fs.existsSync(nodesPath)) {
    fs.readdirSync(nodesPath).forEach((file) => {
      const event = require(path.join(nodesPath, file));
      client.manager.shoukaku.on(event.name, (...args) => event.run(client, ...args));
      totalEvents++;
    });
  }

  client.logger.log(`Node Events Loaded: ${totalEvents}`, "event");
};
