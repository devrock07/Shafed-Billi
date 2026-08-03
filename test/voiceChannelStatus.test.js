const test = require("node:test");
const assert = require("node:assert/strict");
const {
  playbackStatus,
  setVoiceChannelStatus,
} = require("../src/utils/voiceChannelStatus");
const emoji = require("../src/emojis");
const { applyApplicationEmojis, uniqueDefinitions } = require("../src/utils/applicationEmojis");

applyApplicationEmojis(new Map(uniqueDefinitions.map((definition, index) => [
  String(10_000_000_000_000_000n + BigInt(index)),
  { id: String(10_000_000_000_000_000n + BigInt(index)), name: definition.name, animated: false },
])));

function player(overrides = {}) {
  return {
    guildId: "guild-1",
    voiceId: "voice-1",
    loop: "none",
    data: new Map(),
    ...overrides,
  };
}

const track = {
  title: "Around the World",
  author: "Daft Punk - Topic",
  isStream: false,
};

test("builds useful playback states", () => {
  assert.equal(playbackStatus(player(), track), `${emoji.music} Playing · Around the World — Daft Punk`);
  assert.equal(playbackStatus(player(), track, "paused"), `${emoji.pause} Paused · Around the World — Daft Punk`);
  assert.equal(playbackStatus(player(), null, "idle"), `${emoji.music} Ready for music · Use /play`);
});

test("includes loop and autoplay modes", () => {
  const active = player({ loop: "track", data: new Map([["autoplay", true]]) });
  assert.ok(playbackStatus(active, track).includes(`${emoji.loop} Track loop`));
  assert.ok(playbackStatus(active, track).includes(`${emoji.autoplay} Autoplay`));
});

test("updates through the documented route and skips duplicate writes", async () => {
  const calls = [];
  const client = {
    rest: { put: async (...args) => calls.push(args) },
    logger: { log() {} },
  };
  const active = player();
  const status = `${emoji.music} Playing`;

  assert.equal(await setVoiceChannelStatus(client, active, status), true);
  assert.equal(await setVoiceChannelStatus(client, active, status), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], "/channels/voice-1/voice-status");
  assert.deepEqual(calls[0][1], { body: { status } });
});
