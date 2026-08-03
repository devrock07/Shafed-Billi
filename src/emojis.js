const manifest = Object.freeze({
  check: { name: "sb_check", file: "check.png" },
  cross: { name: "sb_cross", file: "cross.png" },
  info: { name: "sb_info", file: "info.png" },
  warn: { name: "sb_warn", file: "warn.png" },
  star: { name: "sb_star", file: "star.png" },
  dot: { name: "sb_dot", file: "dot.png" },
  load: { name: "sb_loading", file: "loading.png" },
  pause: { name: "sb_pause", file: "pause.png" },
  play: { name: "sb_play", file: "play.png" },
  stop: { name: "sb_stop", file: "stop.png" },
  voldown: { name: "sb_voldown", file: "voldown.png" },
  volup: { name: "sb_volup", file: "volup.png" },
  skip: { name: "sb_skip", file: "skip.png" },
  previous: { name: "sb_previous", file: "previous.png" },
  shuffle: { name: "sb_shuffle", file: "shuffle.png" },
  suffle: { name: "sb_shuffle", file: "shuffle.png" },
  loop: { name: "sb_loop", file: "loop.png" },
  autoplay: { name: "sb_autoplay", file: "autoplay.png" },
  music: { name: "sb_music", file: "music.png" },
  config: { name: "sb_config", file: "config.png" },
  utility: { name: "sb_utility", file: "utility.png" },
  filters: { name: "sb_filters", file: "filters.png" },
  home: { name: "sb_home", file: "home.png" },
  dance: { name: "sb_dance", file: "dance.png" },
  youtube: { name: "sb_youtube", file: "youtube.png" },
  spotify: { name: "sb_spotify", file: "spotify.png" },
  ytmusic: { name: "sb_ytmusic", file: "ytmusic.png" },
  applemusic: { name: "sb_applemusic", file: "applemusic.png" },
  deezer: { name: "sb_deezer", file: "deezer.png" },
  jiosaavn: { name: "sb_jiosaavn", file: "jiosaavn.png" },
  like: { name: "sb_favourite", file: "favourite.png" },
  favourite: { name: "sb_favourite", file: "favourite.png" },
});

const registry = Object.fromEntries(Object.keys(manifest).map((key) => [key, ""]));

Object.defineProperty(registry, "manifest", {
  value: manifest,
  enumerable: false,
  writable: false,
});

module.exports = registry;
