const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function javascriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? javascriptFiles(fullPath) : entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

test("custom premium gates and degraded audio paths are absent", () => {
  const sourceRoot = path.join(__dirname, "..", "src");
  const forbidden = /checkPremium|applyQualityFilters|premium-only|PremiumUser|PremiumRole|premiumplay|noticeably lower quality/i;
  const violations = javascriptFiles(sourceRoot).filter((file) => forbidden.test(fs.readFileSync(file, "utf8")));
  assert.deepEqual(violations, []);
});
