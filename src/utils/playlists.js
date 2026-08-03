const MAX_PLAYLISTS = 20;
const MAX_TRACKS = 100;
const MAX_NAME_LENGTH = 32;

function cleanPlaylistName(input) {
  return String(input || "").replace(/\s+/g, " ").trim();
}

function playlistKey(input) {
  return cleanPlaylistName(input).toLocaleLowerCase("en-US");
}

function validPlaylistName(input) {
  const raw = String(input || "");
  const name = cleanPlaylistName(input);
  return name.length >= 1 && name.length <= MAX_NAME_LENGTH && !/[\r\n`<>]/.test(raw);
}

function findPlaylist(library, name) {
  const key = playlistKey(name);
  return library?.playlists?.find((playlist) => playlist.key === key) || null;
}

function trackSnapshot(track) {
  return {
    title: String(track?.title || "Unknown track"),
    url: String(track?.uri || track?.url || ""),
    duration: Math.max(0, Number(track?.length || track?.duration) || 0),
    thumbnail: track?.thumbnail || track?.artworkUrl || null,
    author: String(track?.author || "Unknown Artist"),
  };
}

function totalDuration(tracks = []) {
  return tracks.reduce((total, track) => total + (Number(track.duration) || 0), 0);
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, Number(milliseconds) || 0) / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
    : `${minutes}:${String(seconds).padStart(2, "0")}`;
}

module.exports = {
  MAX_NAME_LENGTH,
  MAX_PLAYLISTS,
  MAX_TRACKS,
  cleanPlaylistName,
  findPlaylist,
  formatDuration,
  playlistKey,
  totalDuration,
  trackSnapshot,
  validPlaylistName,
};
