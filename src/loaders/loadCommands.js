const fs = require("fs");
const path = require("path");

module.exports = (client) => {
  const commandsPath = path.join(__dirname, "../commands");
  let totalCommands = 0;

  fs.readdirSync(commandsPath).forEach((dir) => {
    const commandFiles = fs
      .readdirSync(path.join(commandsPath, dir))
      .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) {
      const command = require(path.join(commandsPath, dir, file));

      client.commands.set(command.name, command);

      if (command.slashExecute || command.slashOptions) {
        const slashData = {
          name: command.name,
          description: command.description || "No description provided",
          options: command.slashOptions || [],
          category: command.category,
          execute: command.execute,
          slashExecute: command.slashExecute,
          autocomplete: command.autocomplete,
          run: command.run,
          player: command.player,
          inVoiceChannel: command.inVoiceChannel,
          sameVoiceChannel: command.sameVoiceChannel,
          botPerms: command.botPerms,
          userPerms: command.userPerms,
          owner: command.owner || false,
        };

        client.slashCommands.set(command.name, slashData);
      }

      totalCommands++;
    }
  });

  client.logger.log(`Prefix Commands Loaded: ${totalCommands}`, "cmd");
  client.logger.log(`Slash Commands Loaded: ${client.slashCommands.size}`, "cmd");
};
