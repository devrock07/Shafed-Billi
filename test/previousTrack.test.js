const test = require("node:test");
const assert = require("node:assert/strict");
const { playPreviousTrack } = require("../src/utils/previousTrack");

function playerWith(history) {
  const inserted = [];
  return {
    data: new Map([["history", history]]),
    queue: {
      current: { title: "Current", uri: "https://example.com/current" },
      unshift: (track) => inserted.unshift(track),
    },
    search: async () => ({ tracks: [{ title: "Previous", uri: "https://example.com/previous" }] }),
    skip: async () => {},
    inserted,
  };
}

test("rewind restores the latest history entry and preserves the current track", async () => {
  const active = playerWith([{ title: "Previous", uri: "https://example.com/previous" }]);
  const restored = await playPreviousTrack(active, { id: "listener" });

  assert.equal(restored.title, "Previous");
  assert.equal(active.data.get("history").length, 0);
  assert.deepEqual(active.inserted.map((track) => track.title), ["Previous", "Current"]);
});

test("rewind reports an empty history", async () => {
  await assert.rejects(
    playPreviousTrack(playerWith([]), { id: "listener" }),
    (error) => error.code === "NO_HISTORY",
  );
});
