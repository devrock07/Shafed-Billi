function isClusterChild(environment = process.env) {
  return environment.CLUSTER_MANAGER_MODE === "process" || environment.CLUSTER_MANAGER_MODE === "worker";
}

function resolveClusterInfo(getInfo, environment = process.env) {
  return isClusterChild(environment) ? getInfo() : null;
}

function discordShardOptions(info) {
  if (!info) return {};
  return {
    shards: info.SHARD_LIST,
    shardCount: info.TOTAL_SHARDS,
  };
}

module.exports = { discordShardOptions, isClusterChild, resolveClusterInfo };
