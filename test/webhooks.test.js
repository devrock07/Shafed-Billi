const test = require("node:test");
const assert = require("node:assert/strict");
const { getWebhookClient, isHttpUrl, sendWebhook } = require("../src/utils/webhooks");

function client(url = "") {
  const warnings = [];
  return {
    config: { Webhooks: { guild_join: url } },
    logger: { log: (message) => warnings.push(message) },
    warnings,
  };
}

test("optional webhook URLs can be empty", async () => {
  const bot = client();
  assert.equal(getWebhookClient(bot, "guild_join"), null);
  assert.equal(await sendWebhook(bot, "guild_join", { content: "hello" }), false);
  assert.equal(bot.warnings.length, 0);
});

test("invalid webhook placeholders are disabled without throwing", () => {
  const bot = client("WEBHOOK_URL_HERE");
  assert.equal(getWebhookClient(bot, "guild_join"), null);
  assert.equal(getWebhookClient(bot, "guild_join"), null);
  assert.equal(bot.warnings.length, 1);
});

test("valid URLs are cached", () => {
  const token = "a".repeat(68);
  const bot = client(`https://discord.com/api/webhooks/123456789012345678/${token}`);
  const first = getWebhookClient(bot, "guild_join");
  assert.ok(first);
  assert.equal(getWebhookClient(bot, "guild_join"), first);
});

test("link validation accepts only parseable HTTP URLs", () => {
  assert.equal(isHttpUrl("https://discord.gg/example"), true);
  assert.equal(isHttpUrl("not-a-url"), false);
  assert.equal(isHttpUrl(""), false);
});
