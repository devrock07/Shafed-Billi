const test = require("node:test");
const assert = require("node:assert/strict");
const { discordShardOptions, isClusterChild, resolveClusterInfo } = require("../src/utils/clusterMode");

test("direct hosting-panel startup uses standalone Discord sharding", () => {
  let calls = 0;
  const info = resolveClusterInfo(() => { calls += 1; }, {});
  assert.equal(info, null);
  assert.equal(calls, 0);
  assert.deepEqual(discordShardOptions(info), {});
  assert.equal(isClusterChild({}), false);
});

test("cluster children retain their assigned shard data", () => {
  const expected = { SHARD_LIST: [2, 3], TOTAL_SHARDS: 4 };
  const info = resolveClusterInfo(() => expected, { CLUSTER_MANAGER_MODE: "process" });
  assert.equal(info, expected);
  assert.deepEqual(discordShardOptions(info), { shards: [2, 3], shardCount: 4 });
});
