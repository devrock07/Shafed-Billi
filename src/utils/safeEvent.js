function safeEventHandler(client, scope, event) {
  return (...args) => {
    Promise.resolve()
      .then(() => event.run(client, ...args))
      .catch((error) => {
        client.logger?.log(
          `[${scope}:${event.name}] ${error.stack || error.message || error}`,
          "error",
        );
      });
  };
}

module.exports = { safeEventHandler };
