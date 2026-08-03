const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { artworkUrl, cleanAuthorName } = require("./presentation");

const WIDTH = 1_000;
const HEIGHT = 250;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function drawCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function fitText(ctx, input, maxWidth) {
  const value = String(input || "Unknown").replace(/\s+/g, " ").trim();
  if (ctx.measureText(value).width <= maxWidth) return value;

  let result = value;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result.trimEnd()}…`;
}

async function fetchArtwork(url) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Unsupported artwork URL.");

  const response = await fetch(parsed, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Artwork request failed with ${response.status}.`);

  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error("Artwork exceeds the size limit.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Artwork exceeds the size limit.");
  return loadImage(buffer);
}

async function renderTrackBanner(artwork, track = {}) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#313338";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.filter = "blur(12px)";
  ctx.globalAlpha = 0.82;
  drawCover(ctx, artwork, -20, -45, WIDTH + 40, HEIGHT + 90);
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
  shade.addColorStop(0, "rgba(35, 37, 43, 0.58)");
  shade.addColorStop(0.64, "rgba(35, 37, 43, 0.66)");
  shade.addColorStop(1, "rgba(35, 37, 43, 0.74)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "#f2f3f5";
  ctx.font = "700 42px sans-serif";
  ctx.fillText(fitText(ctx, track.title || "Unknown track", 900), 48, 78);

  ctx.fillStyle = "rgba(242, 243, 245, 0.86)";
  ctx.font = "500 25px sans-serif";
  ctx.fillText(fitText(ctx, cleanAuthorName(track.author), 900), 48, 128);

  const requester = track.requester?.username || track.requester?.displayName || "Listener";
  ctx.fillStyle = "rgba(242, 243, 245, 0.58)";
  ctx.font = "500 18px sans-serif";
  ctx.fillText(fitText(ctx, `Requested by ${requester}`, 900), 48, 184);

  ctx.fillStyle = "rgba(242, 243, 245, 0.38)";
  ctx.fillRect(48, 209, 150, 2);

  return canvas.encode("png");
}

async function createTrackBanner(track) {
  const url = track?.thumbnail || track?.artworkUrl || artworkUrl(track);
  if (!url) return null;
  return renderTrackBanner(await fetchArtwork(url), track);
}

module.exports = { createTrackBanner, renderTrackBanner };
