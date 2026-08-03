class PreviousTrackError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PreviousTrackError";
    this.code = code;
  }
}

async function playPreviousTrack(player, requester) {
  const history = [...(player.data?.get("history") || [])];
  if (!history.length) {
    throw new PreviousTrackError("NO_HISTORY", "No previous songs are available.");
  }

  const previousTrackData = history.at(-1);
  const result = await player.search(previousTrackData.uri || previousTrackData.title, { requester });
  if (!result?.tracks?.length) {
    throw new PreviousTrackError("NOT_FOUND", "The previous track could not be found.");
  }

  const previousTrack = result.tracks[0];
  history.pop();
  player.data.set("history", history);

  if (player.queue.current) player.queue.unshift(player.queue.current);
  player.queue.unshift(previousTrack);
  player.data.set("autoplayAdded", false);
  await player.skip();
  return previousTrack;
}

module.exports = { PreviousTrackError, playPreviousTrack };
