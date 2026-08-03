const test = require("node:test");
const assert = require("node:assert/strict");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const { renderTrackBanner } = require("../src/utils/trackBanner");

test("track banner renders a compact wide PNG", async () => {
  const artwork = createCanvas(512, 512);
  const context = artwork.getContext("2d");
  context.fillStyle = "#3155c6";
  context.fillRect(0, 0, 512, 512);
  context.fillStyle = "#f2f3f5";
  context.fillRect(96, 96, 320, 320);

  const buffer = await renderTrackBanner(artwork);
  const image = await loadImage(buffer);
  assert.equal(image.width, 1_000);
  assert.equal(image.height, 250);
  assert.ok(buffer.length < 1_000_000);
});
