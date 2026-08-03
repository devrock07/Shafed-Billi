const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { artworkUrl } = require("./presentation");

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

async function fetchArtwork(url) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error("Unsupported artwork URL.");

  const response = await fetch(parsed, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`Artwork request failed with ${response.status}.`);

  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_IMAGE_BYTES) throw new Error("Artwork exceeds the size limit.");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) throw new Error("Artwork exceeds the size limit.");
  return loadImage(buffer);
}

async function renderTrackBanner(artwork) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#15171c";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.filter = "blur(26px)";
  ctx.globalAlpha = 0.48;
  drawCover(ctx, artwork, -35, -80, WIDTH + 70, HEIGHT + 160);
  ctx.restore();

  const shade = ctx.createLinearGradient(0, 0, WIDTH, 0);
  shade.addColorStop(0, "rgba(12, 14, 18, 0.32)");
  shade.addColorStop(0.48, "rgba(12, 14, 18, 0.68)");
  shade.addColorStop(1, "rgba(12, 14, 18, 0.92)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(28, 25, 200, 200, 18);
  ctx.clip();
  drawCover(ctx, artwork, 28, 25, 200, 200);
  ctx.restore();

  const glow = ctx.createLinearGradient(270, 0, 760, 0);
  glow.addColorStop(0, "rgba(242, 243, 245, 0.34)");
  glow.addColorStop(1, "rgba(242, 243, 245, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(270, 121, 430, 2);

  ctx.globalAlpha = 0.52;
  ctx.fillStyle = "#f2f3f5";
  for (let index = 0; index < 6; index += 1) {
    const height = 18 + ((index * 17) % 54);
    ctx.beginPath();
    ctx.roundRect(285 + (index * 24), 125 - (height / 2), 8, height, 4);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  return canvas.encode("png");
}

async function createTrackBanner(track) {
  const url = artworkUrl(track);
  if (!url) return null;
  return renderTrackBanner(await fetchArtwork(url));
}

module.exports = { createTrackBanner, renderTrackBanner };
