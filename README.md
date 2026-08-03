# Shafed Billi

<div align="center">
  <p><strong>A component-first Discord music bot powered by Lavalink.</strong></p>
</div>

Shafed Billi combines high-quality playback with an interactive Discord Components V2 interface. It supports prefix and slash commands, multiple music sources, favourites, filters, queue controls, per-server configuration, and automatic voice-connection recovery.

## Highlights

- Clean now-playing cards with artwork, previous, pause, skip, stop, loop, and autoplay controls
- Automatic application-emoji sync with portable IDs for self-hosted bot tokens
- Automatic voice-channel status showing the current track and playback mode
- Fast interactive help browser with category navigation and command autocomplete
- YouTube, YouTube Music, Spotify, Apple Music, Deezer, and JioSaavn search support (subject to your Lavalink plugins)
- Liked songs, history, search, queue management, and audio filters
- MongoDB-backed server settings and user preferences
- Cluster and shard support for larger deployments
- Environment-based secrets with startup validation

## Requirements

- Node.js 20.18.1 or newer
- A Discord bot application with the Server Members, Presence, and Message Content privileged intents enabled
- The bot's `Set Voice Channel Status` permission for automatic playback status text
- MongoDB
- Lavalink v4 with the source plugins you want to support
- Spotify application credentials if Spotify search is enabled

## Setup

```bash
git clone https://github.com/devrock07/Shafed-Billi.git
cd Shafed-Billi
npm install
```

Copy `.env.example` to `.env`, then add at least:

```dotenv
BOT_TOKEN=your_discord_bot_token
OWNER_IDS=your_discord_user_id
MONGODB_URL=mongodb://127.0.0.1:27017/shafed-billi
LAVALINK_URL=localhost:2333
LAVALINK_PASSWORD=youshallnotpass
```

Start the bot:

```bash
npm start
```

On first startup, the bot checks `assets/emojis`, uploads any missing `sb_*` application emojis, and maps the returned IDs in memory. Self-hosters never need to copy emoji IDs into the source. In clustered deployments, cluster `0` uploads while the other clusters wait and fetch the completed set.

The process also reports missing required environment variables clearly instead of failing later with an unclear login or database error.

## Quality checks

```bash
npm run check
npm test
```

`npm run check` validates every JavaScript file. The test suite covers shared presentation helpers used by the player UI.

## Project layout

- `src/commands` — prefix and slash commands grouped by feature
- `src/events` — Discord, Lavalink node, and player events
- `src/loaders` — command, event, node, and player registration
- `src/schema` — Mongoose models
- `src/structures` — the main Discord music client
- `src/utils` — UI, player-card, emoji sync, formatting, logging, and voice-health helpers
- `assets/emojis` — portable transparent PNGs uploaded to each Discord application

See [STRUCTURE.md](STRUCTURE.md) for a deeper architecture overview.

## License and credits

Developed by **DEVROCK**. This project uses the custom terms in [LICENSE.md](LICENSE.md); retain the required author credit when redistributing or modifying the project.
