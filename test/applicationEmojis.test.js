const test = require("node:test");
const assert = require("node:assert/strict");
const emoji = require("../src/emojis");
const {
  applyApplicationEmojis,
  syncApplicationEmojis,
  uniqueDefinitions,
  validateAssets,
} = require("../src/utils/applicationEmojis");

test("every emoji key is backed by a local custom asset", () => {
  assert.doesNotThrow(validateAssets);
  assert.equal(uniqueDefinitions.length, 30);
  assert.ok(Object.values(emoji).every((value) => value === ""));
});

test("application emoji collections populate every runtime ID", () => {
  const collection = new Map(uniqueDefinitions.map((definition, index) => [
    String(10_000_000_000_000_000n + BigInt(index)),
    { id: String(10_000_000_000_000_000n + BigInt(index)), name: definition.name, animated: false },
  ]));

  assert.deepEqual(applyApplicationEmojis(collection), []);
  assert.ok(Object.values(emoji).every((value) => /^<:sb_[a-z]+:\d+>$/.test(value)));
  assert.equal(emoji.shuffle, emoji.suffle);
  assert.equal(emoji.like, emoji.favourite);
});

test("startup sync uploads missing assets and maps returned IDs", async () => {
  const cache = new Map();
  let nextId = 10_000_000_000_000_100n;
  const manager = {
    fetch: async () => cache,
    create: async ({ name }) => {
      const item = { id: String(nextId++), name, animated: false };
      cache.set(item.id, item);
      return item;
    },
  };
  const client = {
    application: { emojis: manager },
    cluster: { id: 0 },
    logger: { log() {} },
  };

  await syncApplicationEmojis(client);
  assert.equal(cache.size, uniqueDefinitions.length);
  assert.ok(Object.values(emoji).every((value) => value.includes(":")));
});
