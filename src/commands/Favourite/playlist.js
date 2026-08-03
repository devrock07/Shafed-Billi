const {
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  TextDisplayBuilder,
} = require("discord.js");
const PlaylistLibrary = require("../../schema/playlist");
const { hasAvailableNodes } = require("../../utils/nodeUtils");
const { cleanAuthorName, safeLinkLabel } = require("../../utils/presentation");
const {
  MAX_PLAYLISTS,
  MAX_TRACKS,
  cleanPlaylistName,
  findPlaylist,
  formatDuration,
  playlistKey,
  totalDuration,
  trackSnapshot,
  validPlaylistName,
} = require("../../utils/playlists");

const FLAGS = MessageFlags.IsComponentsV2;

function text(content) {
  return new TextDisplayBuilder().setContent(content);
}

function card(title, description, thumbnail = null) {
  const component = new ContainerBuilder();
  if (thumbnail) {
    component.addSectionComponents(
      new SectionBuilder()
        .addTextDisplayComponents(text(`### ${title}`), text(description))
        .setThumbnailAccessory((item) => item.setURL(thumbnail)),
    );
  } else {
    component.addTextDisplayComponents(text(`### ${title}`), text(description));
  }
  return component;
}

function payload(component) {
  return { components: [component], flags: FLAGS };
}

async function libraryFor(userId) {
  return await PlaylistLibrary.findOne({ userId }) || new PlaylistLibrary({ userId, playlists: [] });
}

function playlistSummary(playlist) {
  return `**${playlist.tracks.length} tracks**  •  **${formatDuration(totalDuration(playlist.tracks))}**`;
}

function playlistView(playlist) {
  const visible = playlist.tracks.slice(0, 10);
  const lines = visible.map((track, index) =>
    `\`${index + 1}\`  [${safeLinkLabel(track.title, 48)}](${track.url}) · ${safeLinkLabel(cleanAuthorName(track.author), 30)}`,
  );
  if (playlist.tracks.length > visible.length) lines.push(`*+${playlist.tracks.length - visible.length} more tracks*`);

  const description = `${playlistSummary(playlist)}\n\n${lines.join("\n") || "This playlist is empty."}`;
  return card(safeLinkLabel(playlist.name, 32), description, playlist.tracks[0]?.thumbnail);
}

async function ensurePlayer(message, client) {
  const voice = message.member?.voice?.channel;
  if (!voice) throw Object.assign(new Error("Join a voice channel first."), { code: "NO_VOICE" });
  if (!hasAvailableNodes(client.manager)) {
    throw Object.assign(new Error("The music server is currently unavailable."), { code: "NO_NODE" });
  }

  let player = client.manager.players.get(message.guild.id);
  if (player && player.voiceId !== voice.id) {
    throw Object.assign(new Error("Join the same voice channel as the bot."), { code: "WRONG_VOICE" });
  }
  if (!player) {
    player = await client.manager.createPlayer({
      guildId: message.guild.id,
      voiceId: voice.id,
      textId: message.channel.id,
      volume: 80,
      deaf: true,
    });
  } else {
    player.textId = message.channel.id;
  }
  return player;
}

async function playPlaylist(message, client, playlist) {
  if (!playlist.tracks.length) {
    return message.reply(payload(card("Empty playlist", "Add the current song with `playlist add <name>`.")));
  }

  let player;
  try {
    player = await ensurePlayer(message, client);
  } catch (error) {
    return message.reply(payload(card("Cannot play playlist", error.message)));
  }

  const loading = await message.reply(payload(card(
    `Loading ${safeLinkLabel(playlist.name, 32)}`,
    `${playlist.tracks.length} tracks are being prepared…`,
    playlist.tracks[0]?.thumbnail,
  )));

  let loaded = 0;
  const wasIdle = !player.playing && !player.paused;
  for (let index = 0; index < playlist.tracks.length; index += 5) {
    const batch = playlist.tracks.slice(index, index + 5);
    const results = await Promise.all(batch.map(async (saved) => {
      try {
        const result = await player.search(saved.url || saved.title, { requester: message.author });
        return result.tracks?.[0] || null;
      } catch {
        return null;
      }
    }));
    for (const track of results) {
      if (!track) continue;
      player.queue.add(track);
      loaded += 1;
    }
  }

  if (wasIdle && loaded > 0) await player.play();
  const skipped = playlist.tracks.length - loaded;
  const description = `**${loaded} tracks queued**${skipped ? `  •  ${skipped} unavailable` : ""}\nRequested by ${message.author}`;
  const finalPayload = payload(card(safeLinkLabel(playlist.name, 32), description, playlist.tracks[0]?.thumbnail));
  if (loading?.edit) return loading.edit(finalPayload);
  return message.reply(finalPayload);
}

async function runAction(message, client, action, rawName, position, prefix) {
  const userId = message.author.id;
  const name = cleanPlaylistName(rawName);

  if (action === "list") {
    const library = await PlaylistLibrary.findOne({ userId });
    if (!library?.playlists?.length) {
      return message.reply(payload(card("Your playlists", `Create one with \`${prefix}playlist create <name>\`.`)));
    }
    const lines = library.playlists.map((playlist, index) =>
      `\`${index + 1}\`  **${safeLinkLabel(playlist.name, 32)}** · ${playlist.tracks.length} tracks`,
    );
    return message.reply(payload(card("Your playlists", lines.join("\n"))));
  }

  if (!validPlaylistName(name)) {
    return message.reply(payload(card("Invalid playlist name", "Use 1–32 characters without markdown or line breaks.")));
  }

  const library = await libraryFor(userId);
  const playlist = findPlaylist(library, name);

  if (action === "create") {
    if (playlist) return message.reply(payload(card("Already exists", `You already have a playlist named **${safeLinkLabel(name)}**.`)));
    if (library.playlists.length >= MAX_PLAYLISTS) {
      return message.reply(payload(card("Playlist limit reached", `You can keep up to ${MAX_PLAYLISTS} playlists.`)));
    }
    library.playlists.push({ name, key: playlistKey(name), tracks: [] });
    await library.save();
    return message.reply(payload(card(name, `Playlist created. Add the current song with \`${prefix}playlist add ${name}\`.`)));
  }

  if (!playlist) return message.reply(payload(card("Playlist not found", `No playlist named **${safeLinkLabel(name)}** exists.`)));

  if (action === "view") return message.reply(payload(playlistView(playlist)));
  if (action === "play") return playPlaylist(message, client, playlist);

  if (action === "add") {
    const player = client.manager.players.get(message.guild.id);
    const current = player?.queue?.current;
    if (!current) return message.reply(payload(card("Nothing playing", "Start a song before adding it to a playlist.")));
    if (!message.member?.voice?.channel || message.member.voice.channel.id !== player.voiceId) {
      return message.reply(payload(card("Wrong voice channel", "Join the bot's voice channel before adding the current song.")));
    }
    if (playlist.tracks.length >= MAX_TRACKS) {
      return message.reply(payload(card("Playlist full", `A playlist can contain up to ${MAX_TRACKS} tracks.`)));
    }
    const saved = trackSnapshot(current);
    if (!saved.url) return message.reply(payload(card("Cannot save track", "This track has no reusable source URL.")));
    if (playlist.tracks.some((track) => track.url === saved.url)) {
      return message.reply(payload(card("Already saved", `**${safeLinkLabel(saved.title)}** is already in this playlist.`)));
    }
    playlist.tracks.push(saved);
    playlist.updatedAt = new Date();
    await library.save();
    return message.reply(payload(card(name, `Added [${safeLinkLabel(saved.title)}](${saved.url})\n${playlistSummary(playlist)}`, saved.thumbnail)));
  }

  if (action === "remove") {
    const index = Number(position) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= playlist.tracks.length) {
      return message.reply(payload(card("Invalid track number", `Choose a position from 1 to ${playlist.tracks.length || 0}.`)));
    }
    const [removed] = playlist.tracks.splice(index, 1);
    playlist.updatedAt = new Date();
    await library.save();
    return message.reply(payload(card(name, `Removed **${safeLinkLabel(removed.title)}** · ${playlist.tracks.length} tracks remain.`)));
  }

  if (action === "delete") {
    library.playlists = library.playlists.filter((item) => item.key !== playlist.key);
    await library.save();
    return message.reply(payload(card("Playlist deleted", `Removed **${safeLinkLabel(playlist.name)}** and its ${playlist.tracks.length} tracks.`)));
  }

  return message.reply(payload(card("Playlist", `Use \`${prefix}playlist\` to see the available actions.`)));
}

const nameOption = {
  name: "name",
  description: "Playlist name",
  type: 3,
  required: true,
  min_length: 1,
  max_length: 32,
};

module.exports = {
  name: "playlist",
  category: "Favourite",
  aliases: ["pl"],
  cooldown: 2,
  description: "Create and play your personal playlists.",
  player: false,
  inVoiceChannel: false,
  sameVoiceChannel: false,
  slashOptions: [
    { name: "list", description: "Show your playlists", type: 1 },
    { name: "create", description: "Create a playlist", type: 1, options: [nameOption] },
    { name: "add", description: "Add the current song", type: 1, options: [nameOption] },
    { name: "view", description: "Show a playlist", type: 1, options: [nameOption] },
    { name: "play", description: "Queue a playlist", type: 1, options: [nameOption] },
    {
      name: "remove",
      description: "Remove a track by position",
      type: 1,
      options: [nameOption, { name: "position", description: "Track number", type: 4, required: true, min_value: 1 }],
    },
    { name: "delete", description: "Delete a playlist", type: 1, options: [nameOption] },
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getSubcommand();
    if (action === "play") await interaction.deferReply();
    const wrapper = {
      guild: interaction.guild,
      channel: interaction.channel,
      author: interaction.user,
      member: interaction.member,
      reply: (options) => interaction.deferred
        ? interaction.editReply(options)
        : interaction.replied
          ? interaction.followUp(options)
          : interaction.reply(options),
    };
    return runAction(
      wrapper,
      client,
      action,
      interaction.options.getString("name") || "",
      interaction.options.getInteger("position"),
      client.prefix,
    );
  },

  async execute(message, args, client, prefix) {
    const action = String(args.shift() || "list").toLowerCase();
    const validActions = new Set(["list", "create", "add", "view", "play", "remove", "delete"]);
    if (!validActions.has(action)) {
      return message.reply(payload(card(
        "Playlist commands",
        `\`${prefix}playlist create <name>\` · \`add\` · \`view\` · \`play\` · \`remove <name> <position>\` · \`delete\` · \`list\``,
      )));
    }
    const position = action === "remove" ? Number(args.pop()) : null;
    return runAction(message, client, action, args.join(" "), position, prefix);
  },
};
