# Shafed Billi architecture

Shafed Billi follows a modular, event-driven design. `devrock.js` is the process supervisor, while `index.js` creates one bot client per cluster.

## Runtime flow

1. `devrock.js` validates configuration and starts `discord-hybrid-sharding`.
2. `index.js` creates `MusicClient`, installs process-level error handling, and logs in.
3. `MusicClient` connects MongoDB, creates the Lavalink manager, and loads commands and events.
4. Discord events route prefix commands, slash commands, autocomplete, and component interactions.
5. Kazagumo player events publish playback cards and keep voice connections healthy.

## Source layout

- `commands/` — command modules grouped into Config, Favourite, Filters, Information, Music, Owner, and Utility
- `events/Client/` — Discord gateway and interaction handlers
- `events/Node/` — Lavalink lifecycle handlers
- `events/Players/` — playback lifecycle handlers
- `loaders/` — module discovery and manager setup
- `schema/` — MongoDB models for server and user state
- `structures/` — `MusicClient`, the application client
- `utils/ui.js` — shared Components V2 theme and notice cards
- `utils/playerCard.js` — reusable now-playing presentation
- `utils/presentation.js` — safe titles, artwork, artists, and progress formatting
- `utils/voiceHealthMonitor.js` — reconnect and idle-health logic

## Command contract

Each command exports a name, category, description, and an `execute`, `slashExecute`, or `run` handler. Optional metadata controls aliases, cooldowns, permissions, voice-channel requirements, player requirements, and slash options.

## Configuration

Runtime configuration lives in environment variables. `src/config.js` maps those variables into the legacy configuration shape used by commands and validates required values at startup. `.env.example` documents every supported setting; `.env` is ignored by Git.

## UI conventions

User-facing screens use Discord Components V2. Shared brand colors, separators, notices, player cards, typography, and progress formatting live under `src/utils` so commands remain consistent and easier to maintain.
