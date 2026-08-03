const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const { join, relative } = require("node:path");

const root = join(__dirname, "..");
const ignored = new Set([".git", "node_modules"]);

function javascriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return javascriptFiles(path);
    return entry.name.endsWith(".js") ? [path] : [];
  });
}

const failures = [];
for (const file of javascriptFiles(root)) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) failures.push(`${relative(root, file)}\n${result.stderr.trim()}`);
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log("Syntax check passed.");
