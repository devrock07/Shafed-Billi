const test = require("node:test");
const assert = require("node:assert/strict");
const { createPlayerCard } = require("../src/utils/playerCard");
const playerCreate = require("../src/events/Players/playerCreate");
const queueUpdate = require("../src/events/Players/queueUpdate");

const client = {
  emoji: require("../src/emojis"),
  logger: { log() {} },
};

const track = {
  identifier: "track-1",
  title: "Side To Side",
  author: "Ariana Grande",
  uri: "https://example.com/track",
  length: 227_000,
  requester: { id: "1", username: "devrock07" },
};

function player(edit) {
  return {
    volume: 80,
    loop: "none",
    shoukaku: { paused: false },
    data: new Map([["nowPlayingMessage", { edit }]]),
    queue: { current: track, length: 0 },
  };
}

test("player card is compact, timer-free, and uses application emojis", () => {
  const json = createPlayerCard(client, player(async () => {}), track, { controls: true }).toJSON();
  const serialized = JSON.stringify(json);
  const buttons = json.components.at(-1).components;

  assert.doesNotMatch(serialized, /00:00|03:47|━|─/);
  assert.equal(buttons.length, 5);
  assert.ok(buttons.every((button) => button.emoji?.id));
});

test("every setVolume call refreshes the live player card", async () => {
  let payload;
  const active = player(async (value) => { payload = value; });
  active.setVolume = async (volume) => { active.volume = volume; return active; };

  await playerCreate.run(client, active);
  await active.setVolume(35);

  assert.match(JSON.stringify(payload), /Volume\*\*  35%/);
});

test("rapid queue changes coalesce into one live refresh", async () => {
  let edits = 0;
  let payload;
  const active = player(async (value) => { edits += 1; payload = value; });

  await queueUpdate.run(client, active);
  active.queue.length = 4;
  await queueUpdate.run(client, active);
  await new Promise((resolve) => setTimeout(resolve, 220));

  assert.equal(edits, 1);
  assert.match(JSON.stringify(payload), /Queue\*\*  4 upcoming/);
});
