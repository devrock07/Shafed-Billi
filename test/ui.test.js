const test = require("node:test");
const assert = require("node:assert/strict");
const { COLORS, container, notice } = require("../src/utils/ui");

test("standard command containers have no decorative accent", () => {
  const json = container().toJSON();
  assert.equal(json.accent_color, undefined);
});

test("notices use color only to communicate state", () => {
  const success = notice({ title: "Saved", tone: "success" }).toJSON();
  const warning = notice({ title: "Check this", tone: "warning" }).toJSON();
  assert.equal(success.accent_color, COLORS.success);
  assert.equal(warning.accent_color, COLORS.warning);
});
