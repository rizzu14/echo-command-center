/**
 * Redis client factory for ECHO.
 * Supports both standalone and cluster modes, configured via environment variables.
 *
 * Environment variables:
 *   REDIS_MODE          "cluster" | "standalone"  (default: "standalone")
 *   REDIS_URL           redis://host:port          (standalone mode)
 *   REDIS_CLUSTER_NODES comma-separated host:port  (cluster mode)
 *   REDIS_PASSWORD      optional auth password
 *   REDIS_TLS           "true" | "false"           (default: "false")
 */

import Redis, { Cluster, ClusterNode, RedisOptions } from "ioredis";

export type RedisClient = Redis | Cluster;

export interface RedisConfig {
  mode: "standalone" | "cluster";
  url?: string;
  clusterNodes?: ClusterNode[];
  password?: string;
  tls?: boolean;
}

function parseConfig(): RedisConfig {
  const mode =
    (process.env.REDIS_MODE as "standalone" | "cluster") ?? "standalone";

  const password = process.env.REDIS_PASSWORD;
  const tls = process.env.REDIS_TLS === "true";

  if (mode === "cluster") {
    const raw = process.env.REDIS_CLUSTER_NODES ?? "127.0.0.1:7000";
    const clusterNodes: ClusterNode[] = raw.split(",").map((node) => {
      const [host, portStr] = node.trim().split(":");
      return { host, port: parseInt(portStr ?? "6379", 10) };
    });
    return { mode, clusterNodes, password, tls };
  }

  return {
    mode,
    url: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    password,
    tls,
  };
}

export function createRedisClient(overrides?: Partial<RedisConfig>): RedisClient {
  const config = { ...parseConfig(), ...overrides };

  const sharedOptions: RedisOptions = {
    password: config.password,
    ...(config.tls ? { tls: {} } : {}),
    lazyConnect: true,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
  };

  if (config.mode === "cluster") {
    const nodes = config.clusterNodes ?? [{ host: "127.0.0.1", port: 7000 }];
    return new Cluster(nodes, {
      redisOptions: sharedOptions,
      clusterRetryStrategy: (times: number) => Math.min(times * 100, 3000),
    });
  }

  return new Redis(config.url ?? "redis://127.0.0.1:6379", sharedOptions);
}

/** Singleton client — use in application code. */
let _client: RedisClient | null = null;

export function getRedisClient(): RedisClient {
  if (!_client) {
    _client = createRedisClient();
  }
  return _client;
}

export async function closeRedisClient(): Promise<void> {
  if (_client) {
    await _client.quit();
    _client = null;
  }
}
