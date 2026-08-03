const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function cleanAuthorName(author) {
  return String(author || "Unknown Artist").replace(/\s*-\s*Topic\s*$/i, "").trim();
}

function truncate(text, maxLength = 45) {
  const value = String(text || "Unknown");
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function safeLinkLabel(text, maxLength = 80) {
  return truncate(text, maxLength).replace(/[\[\]]/g, "");
}

function artworkUrl(track) {
  const url = track?.thumbnail || track?.artworkUrl;
  if (!url) return null;

  const youtubeId = url.match(/(?:vi\/|vi_webp\/)([^/]+)/)?.[1];
  return youtubeId ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg` : url;
}

function progressBar(position = 0, duration = 0, size = 18) {
  const safeDuration = Math.max(0, Number(duration) || 0);
  const safePosition = clamp(Number(position) || 0, 0, safeDuration || 0);
  const ratio = safeDuration > 0 ? safePosition / safeDuration : 0;
  const marker = clamp(Math.round(ratio * (size - 1)), 0, size - 1);
  return `${"━".repeat(marker)}●${"─".repeat(size - marker - 1)}`;
}

module.exports = {
  artworkUrl,
  cleanAuthorName,
  progressBar,
  safeLinkLabel,
  truncate,
};

