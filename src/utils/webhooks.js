const { WebhookClient } = require("discord.js");

function isHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function warningOnce(client, key, message) {
  if (!client.webhookWarnings) client.webhookWarnings = new Set();
  if (client.webhookWarnings.has(key)) return;
  client.webhookWarnings.add(key);
  client.logger?.log(message, "warn");
}

function getWebhookClient(client, name) {
  const url = client.config?.Webhooks?.[name]?.trim();
  if (!url) return null;

  if (!client.webhookClients) client.webhookClients = new Map();
  const cached = client.webhookClients.get(name);
  if (cached?.url === url) return cached.webhook;

  try {
    const webhook = new WebhookClient({ url });
    client.webhookClients.set(name, { url, webhook });
    return webhook;
  } catch (error) {
    warningOnce(
      client,
      `invalid:${name}`,
      `[Webhook] ${name} is disabled because its URL is invalid. Leave the environment variable empty or add a complete Discord webhook URL.`,
    );
    return null;
  }
}

async function sendWebhook(client, name, payload) {
  const webhook = getWebhookClient(client, name);
  if (!webhook) return false;

  try {
    await webhook.send(payload);
    return true;
  } catch (error) {
    warningOnce(
      client,
      `send:${name}`,
      `[Webhook] ${name} delivery failed: ${error.message}`,
    );
    return false;
  }
}

module.exports = { getWebhookClient, isHttpUrl, sendWebhook };

