const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cleanPlaylistName,
  findPlaylist,
  formatDuration,
  playlistKey,
  totalDuration,
  trackSnapshot,
  validPlaylistName,
} = require("../src/utils/playlists");

test("playlist names are clean and matched without case sensitivity", () => {
  assert.equal(cleanPlaylistName("  Late   Night  "), "Late Night");
  assert.equal(playlistKey("Late NIGHT"), "late night");
  assert.equal(findPlaylist({ playlists: [{ key: "late night" }] }, "LATE NIGHT").key, "late night");
  assert.equal(validPlaylistName("Late Night"), true);
  assert.equal(validPlaylistName("bad\nname"), false);
});

test("playlist tracks preserve reusable playback metadata", () => {
  assert.deepEqual(trackSnapshot({
    title: "Song",
    uri: "https://example.com/song",
    length: 125_000,
    thumbnail: "https://example.com/art.png",
    author: "Artist",
  }), {
    title: "Song",
    url: "https://example.com/song",
    duration: 125_000,
    thumbnail: "https://example.com/art.png",
    author: "Artist",
  });
  assert.equal(totalDuration([{ duration: 60_000 }, { duration: 65_000 }]), 125_000);
  assert.equal(formatDuration(125_000), "2:05");
  assert.equal(formatDuration(3_725_000), "1:02:05");
});
