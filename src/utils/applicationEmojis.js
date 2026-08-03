const path = require("node:path");
const fs = require("node:fs");
const registry = require("../emojis");

const ASSET_DIR = path.join(__dirname, "..", "..", "assets", "emojis");
const uniqueDefinitions = [...new Map(
  Object.values(registry.manifest).map((definition) => [definition.name, definition]),
).values()];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function indexByName(collection) {
  return new Map([...collection.values()].map((item) => [item.name, item]));
}

function applyApplicationEmojis(collection) {
  const byName = indexByName(collection);
  const missing = [];

  for (const [key, definition] of Object.entries(registry.manifest)) {
    const item = byName.get(definition.name);
    registry[key] = item ? `<${item.animated ? "a" : ""}:${item.name}:${item.id}>` : "";
    if (!item) missing.push(definition.name);
  }

  return [...new Set(missing)];
}

function validateAssets() {
  const missing = uniqueDefinitions
    .map((definition) => path.join(ASSET_DIR, definition.file))
    .filter((assetPath) => !fs.existsSync(assetPath));

  if (missing.length) {
    throw new Error(`Missing application emoji assets: ${missing.map((item) => path.basename(item)).join(", ")}`);
  }
}

async function fetchUntilComplete(manager, attempts = 1) {
  let collection;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    collection = await manager.fetch();
    if (applyApplicationEmojis(collection).length === 0) return collection;
    if (attempt < attempts - 1) await sleep(1_500);
  }
  return collection;
}

async function syncApplicationEmojis(client) {
  validateAssets();
  const manager = client.application?.emojis;
  if (!manager) throw new Error("Discord application emoji manager is unavailable.");

  const leader = !Number.isInteger(client.cluster?.id) || client.cluster.id === 0;
  let collection = await manager.fetch();
  let byName = indexByName(collection);
  let uploaded = 0;

  if (leader) {
    for (const definition of uniqueDefinitions) {
      if (byName.has(definition.name)) continue;

      try {
        const created = await manager.create({
          attachment: path.join(ASSET_DIR, definition.file),
          name: definition.name,
        });
        byName.set(created.name, created);
        uploaded += 1;
        client.logger?.log(`[Emoji sync] Uploaded ${created.name}.`, "ready");
      } catch (error) {
        collection = await manager.fetch();
        byName = indexByName(collection);
        if (!byName.has(definition.name)) {
          client.logger?.log(`[Emoji sync] ${definition.name} failed: ${error.message}`, "error");
        }
      }
    }
    collection = await manager.fetch();
  } else {
    collection = await fetchUntilComplete(manager, 20);
  }

  const missing = applyApplicationEmojis(collection);
  if (missing.length) throw new Error(`Application emoji sync incomplete: ${missing.join(", ")}`);

  client.logger?.log(
    `[Emoji sync] ${uniqueDefinitions.length} emojis ready${uploaded ? `, ${uploaded} uploaded` : ""}.`,
    "ready",
  );
  return registry;
}

module.exports = {
  ASSET_DIR,
  applyApplicationEmojis,
  syncApplicationEmojis,
  uniqueDefinitions,
  validateAssets,
};
