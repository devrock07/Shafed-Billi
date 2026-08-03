const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  StringSelectMenuBuilder,
} = require("discord.js");
const Prefix = require("../../schema/prefix");
const { truncate } = require("../../utils/presentation");
const { container, flags, noticePayload, separator, text } = require("../../utils/ui");
const { isHttpUrl } = require("../../utils/webhooks");
const emoji = require("../../emojis");

const CATEGORY_INFO = Object.freeze({
  Config: { get emoji() { return emoji.config; }, description: "Server setup and preferences" },
  Filters: { get emoji() { return emoji.filters; }, description: "Audio effects and equalizer" },
  Information: { get emoji() { return emoji.info; }, description: "Bot status and useful links" },
  Music: { get emoji() { return emoji.music; }, description: "Playback and queue controls" },
  Favourite: { get emoji() { return emoji.favourite; }, description: "Your liked songs and playlists" },
  Utility: { get emoji() { return emoji.utility; }, description: "Member and server utilities" },
});

function publicCommands(client) {
  return [...client.commands.values()]
    .filter((command) => command.name && command.category !== "Owner" && !command.owner)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function commandGroups(client) {
  return publicCommands(client).reduce((groups, command) => {
    const category = command.category || "Utility";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(command);
    return groups;
  }, new Map());
}

function findCommand(client, query) {
  const normalized = String(query || "").toLowerCase();
  return publicCommands(client).find((command) =>
    command.name.toLowerCase() === normalized || command.aliases?.some((alias) => alias.toLowerCase() === normalized),
  );
}

function menuRow(groups, disabled = false) {
  const options = [{
    label: "Overview",
    value: "home",
    description: "Return to the main help screen",
    emoji: emoji.home,
  }];

  for (const [category, commands] of groups) {
    const info = CATEGORY_INFO[category] || { emoji: emoji.utility, description: `${category} commands` };
    options.push({
      label: category,
      value: category,
      description: `${commands.length} commands · ${info.description}`.slice(0, 100),
      emoji: info.emoji,
    });
  }

  const menu = new StringSelectMenuBuilder()
    .setCustomId("help:category")
    .setPlaceholder(disabled ? "Help menu expired — run help again" : "Browse a command category")
    .setDisabled(disabled)
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

function linkRow(config) {
  const buttons = [];
  if (isHttpUrl(config.links?.support)) {
    buttons.push(new ButtonBuilder().setLabel("Support server").setEmoji(emoji.info).setURL(config.links.support).setStyle(ButtonStyle.Link));
  }
  if (isHttpUrl(config.links?.invite)) {
    buttons.push(new ButtonBuilder().setLabel("Invite Shafed Billi").setEmoji(emoji.home).setURL(config.links.invite).setStyle(ButtonStyle.Link));
  }
  return buttons.length ? new ActionRowBuilder().addComponents(buttons) : null;
}

function compactUptime(milliseconds = 0) {
  const totalMinutes = Math.floor(milliseconds / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  return [days && `${days}d`, hours && `${hours}h`, `${minutes}m`].filter(Boolean).join(" ");
}

function homeView(client, requester, groups, disabled = false) {
  const count = [...groups.values()].reduce((total, commands) => total + commands.length, 0);
  const categorySummary = [...groups].map(([category, commands]) => {
    const info = CATEGORY_INFO[category] || { emoji: emoji.utility, description: `${category} commands` };
    return `${info.emoji} **${category}**  \`${commands.length}\``;
  }).join("\n");
  const status = client.isReady?.() !== false ? "Online" : "Connecting";
  const ping = Math.max(0, Math.round(client.ws?.ping || 0));

  const card = container()
    .addTextDisplayComponents(text(`## Shafed Billi\n-# ${count} commands · ${groups.size} categories`))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(
      `**Status**  \`${status}\`   **Ping**  \`${ping} ms\`   **Uptime**  \`${compactUptime(client.uptime)}\``,
    ))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(categorySummary))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(`-# Requested by ${requester.username}`))
    .addActionRowComponents(menuRow(groups, disabled));

  const links = linkRow(client.config);
  if (links) card.addActionRowComponents(links);
  return card;
}

function categoryView(category, commands, prefix, groups, requester, disabled = false) {
  const info = CATEGORY_INFO[category] || { emoji: emoji.utility, description: `${category} commands` };
  const listing = commands.map((command) => `\`${command.name}\``).join("  ");

  return container()
    .addTextDisplayComponents(text(`## ${info.emoji} ${category}\n-# ${commands.length} commands · ${info.description}`))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(listing || "No public commands are available in this category."))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(`Use \`/${commands[0]?.name || "help"}\` or \`${prefix}help <command>\` for details.\n-# Requested by ${requester.username} · Developed by DEVROCK`))
    .addActionRowComponents(menuRow(groups, disabled));
}

function commandView(command, prefix, requester) {
  const options = command.slashOptions || [];
  const slashUsage = options.map((option) => option.required ? `<${option.name}>` : `[${option.name}]`).join(" ");
  const aliases = command.aliases?.length ? command.aliases.map((alias) => `\`${alias}\``).join(", ") : "None";
  const requirements = [
    command.inVoiceChannel && "Join a voice channel",
    command.sameVoiceChannel && "Use the bot's voice channel",
    command.player && "Active player required",
  ].filter(Boolean).join(" · ") || "None";

  return container()
    .addTextDisplayComponents(text(`## /${command.name}\n-# ${command.category || "Command"} · ${command.description || "No description provided"}`))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(
      `**Slash usage**\n\`/${command.name}${slashUsage ? ` ${slashUsage}` : ""}\`\n\n` +
      `**Prefix usage**\n\`${prefix}${command.name}${command.usage ? ` ${command.usage}` : ""}\`\n\n` +
      `**Aliases**\n${aliases}\n\n` +
      `**Requirements**\n${requirements}`,
    ))
    .addSeparatorComponents(separator())
    .addTextDisplayComponents(text(`-# Cooldown: ${command.cooldown || 3}s · Requested by ${requester.username}`));
}

async function serverPrefix(client, guildId) {
  try {
    const stored = await Prefix.findOne({ Guild: guildId }).lean();
    return stored?.Prefix || client.prefix;
  } catch {
    return client.prefix;
  }
}

async function openHelp({ client, requester, guildId, commandName, send, edit }) {
  const prefix = await serverPrefix(client, guildId);
  if (commandName) {
    const command = findCommand(client, commandName);
    if (!command) {
      return edit(noticePayload({
        title: "Command not found",
        description: `No public command matches \`${truncate(commandName, 50)}\`. Try \`${prefix}help\` to browse all commands.`,
        emoji: client.emoji.cross,
        tone: "danger",
      }));
    }
    return edit({ components: [commandView(command, prefix, requester)], flags: flags() });
  }

  const groups = commandGroups(client);
  let selected = "home";
  const message = await edit({
    components: [homeView(client, requester, groups)],
    flags: flags(),
  });

  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.user.id !== requester.id) {
      return interaction.reply(noticePayload({
        title: "This menu belongs to someone else",
        description: "Run the help command to open your own interactive menu.",
        emoji: client.emoji.warn,
        tone: "warning",
      }, true));
    }

    selected = interaction.values[0];
    const view = selected === "home"
      ? homeView(client, requester, groups)
      : categoryView(selected, groups.get(selected) || [], prefix, groups, requester);
    await interaction.update({ components: [view] });
  });

  collector.on("end", () => {
    const view = selected === "home"
      ? homeView(client, requester, groups, true)
      : categoryView(selected, groups.get(selected) || [], prefix, groups, requester, true);
    message.edit({ components: [view] }).catch(() => {});
  });

  return message;
}

module.exports = {
  name: "help",
  category: "Information",
  aliases: ["h", "commands"],
  description: "Browse commands and learn how to use them",
  cooldown: 3,
  slashOptions: [{
    name: "command",
    description: "Show details for a specific command",
    type: 3,
    required: false,
    autocomplete: true,
  }],

  async autocomplete(interaction, client) {
    const query = interaction.options.getFocused().toLowerCase();
    const choices = publicCommands(client)
      .filter((command) => command.name.toLowerCase().includes(query) || command.description?.toLowerCase().includes(query))
      .slice(0, 25)
      .map((command) => ({ name: `${command.name} · ${truncate(command.description, 70)}`, value: command.name }));
    await interaction.respond(choices).catch(() => {});
  },

  async slashExecute(interaction, client) {
    await interaction.reply({
      components: [container().addTextDisplayComponents(
        text(`### ${client.emoji.load} Opening help\n-# Preparing your command browser…`),
      )],
      flags: flags(),
    });

    return openHelp({
      client,
      requester: interaction.user,
      guildId: interaction.guildId,
      commandName: interaction.options.getString("command"),
      send: interaction.reply.bind(interaction),
      edit: interaction.editReply.bind(interaction),
    });
  },

  async execute(message, args, client) {
    const loading = await message.reply({
      components: [container().addTextDisplayComponents(
        text(`### ${client.emoji.load} Opening help\n-# Preparing your command browser…`),
      )],
      flags: flags(),
    });

    return openHelp({
      client,
      requester: message.author,
      guildId: message.guild.id,
      commandName: args[0],
      send: message.reply.bind(message),
      edit: loading.edit.bind(loading),
    });
  },
};
