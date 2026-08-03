const test = require("node:test");
const assert = require("node:assert/strict");
const {
  artworkUrl,
  cleanAuthorName,
  progressBar,
  safeLinkLabel,
  truncate,
} = require("../src/utils/presentation");

test("cleans YouTube topic suffixes", () => {
  assert.equal(cleanAuthorName("Daft Punk - Topic"), "Daft Punk");
  assert.equal(cleanAuthorName(), "Unknown Artist");
});

test("truncates copy without exceeding its limit", () => {
  assert.equal(truncate("short", 10), "short");
  assert.equal(truncate("a very long title", 10), "a very lo…");
  assert.equal(safeLinkLabel("[track]", 20), "track");
});

test("creates stable progress bars for invalid and complete durations", () => {
  assert.equal(progressBar(0, 0, 5), "●────");
  assert.equal(progressBar(100, 100, 5), "━━━━●");
  assert.equal(progressBar(150, 100, 5), "━━━━●");
});

test("normalizes YouTube artwork while preserving other sources", () => {
  assert.equal(
    artworkUrl({ thumbnail: "https://i.ytimg.com/vi/abc123/default.jpg" }),
    "https://i.ytimg.com/vi/abc123/hqdefault.jpg",
  );
  assert.equal(artworkUrl({ artworkUrl: "https://cdn.example/art.jpg" }), "https://cdn.example/art.jpg");
});

