const test = require("node:test");
const assert = require("node:assert/strict");
const {
  reconcilePlaybackModes,
  setAutoplay,
  setLoopMode,
  stopPlaybackModes,
} = require("../src/utils/playbackModes");

function player(loop = "none", autoplay = false) {
  return {
    loop,
    data: new Map([["autoplay", autoplay]]),
    setLoop(mode) { this.loop = mode; },
  };
}

test("enabling autoplay disables track and queue loops", () => {
  const current = player("track", false);
  assert.deepEqual(setAutoplay(current, true), { autoplay: true, disabledLoop: true });
  assert.equal(current.loop, "none");
  assert.equal(current.data.get("autoplay"), true);
});

test("enabling a loop disables autoplay", () => {
  const current = player("none", true);
  assert.deepEqual(setLoopMode(current, "queue"), { mode: "queue", disabledAutoplay: true });
  assert.equal(current.loop, "queue");
  assert.equal(current.data.get("autoplay"), false);
});

test("stale conflicting state is reconciled before playback", () => {
  const current = player("track", true);
  assert.equal(reconcilePlaybackModes(current), true);
  assert.equal(current.loop, "none");
  stopPlaybackModes(current);
  assert.equal(current.data.get("autoplay"), false);
});
