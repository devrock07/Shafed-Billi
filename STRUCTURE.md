# 🏗️ SHAFED BILLI - Code Structure & Architecture

This document provides a detailed breakdown of the **Shafed Billi** codebase, its directory structure, and the core packages used to build this premium music system.

---

## 📂 Directory Structure

The project follows a modular and event-driven architecture for scalability and ease of maintenance.

### 📍 Root Directory
- `devrock.js`: The main entry point of the bot. Initializes clusters and shards.
- `package.json`: Contains project metadata and dependency list.
- `README.md`: General project overview and installation guide.
- `LICENSE.md`: Custom credit protection license by **DEVROCK**.
- `STRUCTURE.md`: This file (Codebase documentation).

### 📍 `src/` - Source Code
The heart of the bot, organized into logical modules:

#### 📁 `commands/`
Contains all bot commands categorized by functionality:
- `Config/`: Server-specific settings (Prefix, 24/7 mode, etc.).
- `Favourite/`: User-specific "Liked Songs" system.
- `Filters/`: Audio processing filters (Bassboost, Nightcore, etc.).
- `Information/`: General bot info (Help, Ping, Stats).
- `Music/`: Core playback controls (Play, Skip, Stop, Volume, etc.).
- `Owner/`: Developer-only administrative commands.
- `Utility/`: Helpful tools (Avatar, Banner, Server info).

#### 📁 `events/`
Handles various Discord and Lavalink events:
- `Client/`: Discord client events (`ready`, `interactionCreate`, `messageCreate`).
- `Node/`: Lavalink node connection events (`error`, `disconnect`, `ready`).
- `Players/`: Music player state changes (`playerStart`, `playerEnd`, `playerEmpty`).

#### 📁 `loaders/`
Automation scripts that load commands, events, and managers during startup:
- `loadCommands.js`: Dynamically registers prefix and slash commands.
- `loadPlayerManager.js`: Initializes the **Kazagumo** music manager.

#### 📁 `schema/`
**Mongoose** models for MongoDB database interactions:
- `247.js`, `prefix.js`, `liked.js`, `blacklist.js`, etc.

#### 📁 `structures/`
Core class definitions, such as the extended `MusicClient`.

#### 📁 `utils/`
Helper functions and shared logic:
- `logger.js`: Custom console logging system.
- `convert.js`: Time and duration formatting.
- `voiceHealthMonitor.js`: Ensures stable voice connections.

---

## 📦 Core Packages & Technologies

### 🌐 Frameworks
- **[Discord.js V14](https://discord.js.org/)**: The primary library for interacting with the Discord API.
- **[Shoukaku](https://github.com/Deivu/Shoukaku)**: A stable and updated Lavalink wrapper.
- **[Kazagumo](https://github.com/Takiyo0/Kazagumo)**: A high-level music manager built on top of Shoukaku.

### 🗄️ Database
- **[Mongoose](https://mongoosejs.com/)**: MongoDB object modeling for storing server prefixes, user favorites, and 24/7 data.

### 🎨 Visuals & UI
- **[@napi-rs/canvas](https://github.com/Brooooooklyn/canvas)**: High-performance canvas for generating "sexy" help banners.
- **Discord Components V2**: Latest UI elements (Containers, Media Galleries, Sections).

### 🎼 Music Utilities
- **Kazagumo-Spotify**: Support for Spotify links and playlists.
- **@flytri/lyrics-finder**: Fetches song lyrics dynamically.

---

## 🛠️ Design Patterns
- **Cluster/Sharding**: Uses `discord-hybrid-sharding` for handling large numbers of servers efficiently.
- **Middleware-style Loaders**: Centralized loading logic for cleaner code.
- **Event-Driven**: Decoupled logic using the built-in EventEmitter for player and node states.

---

<div align="center">
  <p><strong>DESIGNED & DEVELOPED BY DEVROCK</strong></p>
  <p>© 2026 SHAFED BILLI PROJECT</p>
</div>
