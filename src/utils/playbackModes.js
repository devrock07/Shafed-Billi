const LOOP_MODES = new Set(["none", "track", "queue"]);

function applyLoop(player, mode) {
  if (!LOOP_MODES.has(mode)) throw new TypeError(`Invalid loop mode: ${mode}`);
  if (typeof player.setLoop === "function") player.setLoop(mode);
  else player.loop = mode;
}

function setAutoplay(player, enabled) {
  if (!player.data) player.data = new Map();
  const autoplay = Boolean(enabled);
  const disabledLoop = autoplay && (player.loop || "none") !== "none";
  if (autoplay) applyLoop(player, "none");
  player.data.set("autoplay", autoplay);
  return { autoplay, disabledLoop };
}

function setLoopMode(player, mode) {
  applyLoop(player, mode);
  const disabledAutoplay = mode !== "none" && Boolean(player.data?.get("autoplay"));
  if (disabledAutoplay) player.data.set("autoplay", false);
  return { mode, disabledAutoplay };
}

function reconcilePlaybackModes(player) {
  if (!player.data?.get("autoplay") || (player.loop || "none") === "none") return false;
  applyLoop(player, "none");
  return true;
}

function stopPlaybackModes(player) {
  if (!player.data) player.data = new Map();
  player.data.set("autoplay", false);
  applyLoop(player, "none");
}

module.exports = { reconcilePlaybackModes, setAutoplay, setLoopMode, stopPlaybackModes };
