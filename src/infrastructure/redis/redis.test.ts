/**
 * Unit tests for Redis infrastructure classes.
 * Uses an in-memory mock Redis client — no live Redis required.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DigitalTwinStore } from "./digital-twin.js";
import { AgenticPlanCache, PLAN_CACHE_TTL_SECONDS } from "./plan-cache.js";
import { DoWAccumulator, DOW_BUCKET_TTL_SECONDS } from "./dow-accumulator.js";
import { AgentHealthRegistry, HEALTH_TTL_SECONDS } from "./health-registry.js";
import type {
  InfrastructureSnapshot,
  CachedPlan,
  AgentHealthStatus,
} from "./schema.js";

// ── Minimal in-memory Redis mock ─────────────────────────────────────────────

interface MockEntry {
  value: string;
  expiresAt?: number; // ms epoch
}

class MockRedis {
  private store = new Map<string, MockEntry>();

  private isExpired(entry: MockEntry): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry || this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(
    key: string,
    value: string,
    exMode?: string,
    ttlSeconds?: number
  ): Promise<"OK"> {
    const expiresAt =
      exMode === "EX" && ttlSeconds !== undefined
        ? Date.now() + ttlSeconds * 1000
        : undefined;
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async mget(...keys: string[]): Promise<(string | null)[]> {
    return keys.map((k) => {
      const entry = this.store.get(k);
      if (!entry || this.isExpired(entry)) {
        this.store.delete(k);
        return null;
      }
      return entry.value;
    });
  }

  async expire(key: string, seconds: number): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    return 1;
  }

  async incrbyfloat(key: string, increment: number): Promise<string> {
    const entry = this.store.get(key);
    const current = entry && !this.isExpired(entry) ? parseFloat(entry.value) : 0;
    const next = current + increment;
    this.store.set(key, { value: String(next), expiresAt: entry?.expiresAt });
    return String(next);
  }

  pipeline() {
    const ops: Array<() => Promise<unknown>> = [];
    const pipe = {
      incrbyfloat: (key: string, inc: number) => {
        ops.push(() => this.incrbyfloat(key, inc));
        return pipe;
      },
      expire: (key: string, secs: number) => {
        ops.push(() => this.expire(key, secs));
        return pipe;
      },
      exec: async () => {
        const results: unknown[] = [];
        for (const op of ops) results.push(await op());
        return results;
      },
    };
    return pipe;
  }

  /** scanStream mock — returns all matching keys in one batch. */
  scanStream({ match }: { match: string; count?: number }) {
    const pattern = match.replace(/\*/g, ".*").replace(/\?/g, ".");
    const regex = new RegExp(`^${pattern}$`);
    const keys = [...this.store.keys()].filter((k) => {
      const entry = this.store.get(k)!;
      return !this.isExpired(entry) && regex.test(k);
    });

    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const stream = {
      on: (event: string, cb: (...args: unknown[]) => void) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(cb);
        return stream;
      },
    };

    // Emit asynchronously so callers can attach listeners first
    setImmediate(() => {
      listeners["data"]?.forEach((cb) => cb(keys));
      listeners["end"]?.forEach((cb) => cb());
    });

    return stream;
  }

  /** Expose store size for test assertions. */
  size(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }
}

// ── Fixtures ─────────────────────────────────────────────────────────────────

function makeSnapshot(
  tenantId: string,
  resourceId: string
): InfrastructureSnapshot {
  return {
    resource_id: resourceId,
    tenant_id: tenantId,
    resource_type: "EC2_INSTANCE",
    region: "us-east-1",
    provider: "AWS",
    status: "RUNNING",
    hourly_cost_usd: 0.5,
    metrics: {
      cpu_utilization_pct: 12,
      memory_utilization_pct: 45,
      storage_utilization_pct: 30,
      network_in_bytes_per_sec: 1024,
      network_out_bytes_per_sec: 512,
    },
    tags: { env: "prod" },
    captured_at: new Date().toISOString(),
  };
}

function makePlan(
  tenantId: string,
  resourceId: string,
  actionType = "SCALE_DOWN",
  parameters: Record<string, unknown> = { target_size: "t3.small" }
): CachedPlan {
  const hash = AgenticPlanCache.computeActionHash(actionType, resourceId, parameters);
  return {
    plan_id: `plan-${hash.slice(0, 8)}`,
    tenant_id: tenantId,
    action_type: actionType,
    resource_id: resourceId,
    parameters,
    action_hash: hash,
    risk_score: 25,
    simulation_results: { predicted_savings_usd: 120 },
    approval_records: [
      { approved_by: "auto", approved_at: new Date().toISOString(), approval_type: "AUTO" },
    ],
    projected_savings_usd: 120,
    cached_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + PLAN_CACHE_TTL_SECONDS * 1000).toISOString(),
  };
}

function makeHealth(tenantId: string, agentId: string): AgentHealthStatus {
  return {
    agent_id: agentId,
    tenant_id: tenantId,
    status: "HEALTHY",
    last_heartbeat: new Date().toISOString(),
    action_rate_7d_baseline: 10,
    current_action_rate: 11,
    confidence_threshold: 85,
    consecutive_errors_24h: 0,
    reasoning_accuracy_pct: 92,
    structured_hallucination_rate_pct: 1.2,
  };
}

// ── DigitalTwinStore tests ────────────────────────────────────────────────────

describe("DigitalTwinStore", () => {
  let redis: MockRedis;
  let store: DigitalTwinStore;

  beforeEach(() => {
    redis = new MockRedis();
    store = new DigitalTwinStore(redis as any);
  });

  it("returns null for a missing snapshot", async () => {
    const result = await store.getSnapshot("t1", "r1");
    expect(result).toBeNull();
  });

  it("stores and retrieves a snapshot", async () => {
    const snap = makeSnapshot("t1", "r1");
    await store.setSnapshot("t1", "r1", snap);
    const retrieved = await store.getSnapshot("t1", "r1");
    expect(retrieved).toEqual(snap);
  });

  it("overwrites an existing snapshot", async () => {
    const snap1 = makeSnapshot("t1", "r1");
    const snap2 = { ...snap1, hourly_cost_usd: 1.5 };
    await store.setSnapshot("t1", "r1", snap1);
    await store.setSnapshot("t1", "r1", snap2);
    const retrieved = await store.getSnapshot("t1", "r1");
    expect(retrieved?.hourly_cost_usd).toBe(1.5);
  });

  it("deletes a snapshot", async () => {
    const snap = makeSnapshot("t1", "r1");
    await store.setSnapshot("t1", "r1", snap);
    await store.deleteSnapshot("t1", "r1");
    expect(await store.getSnapshot("t1", "r1")).toBeNull();
  });

  it("getAllSnapshots returns all snapshots for a tenant", async () => {
    await store.setSnapshot("t1", "r1", makeSnapshot("t1", "r1"));
    await store.setSnapshot("t1", "r2", makeSnapshot("t1", "r2"));
    await store.setSnapshot("t2", "r3", makeSnapshot("t2", "r3")); // different tenant

    const snaps = await store.getAllSnapshots("t1");
    expect(snaps).toHaveLength(2);
    const ids = snaps.map((s) => s.resource_id).sort();
    expect(ids).toEqual(["r1", "r2"]);
  });

  it("getAllSnapshots returns empty array when no snapshots exist", async () => {
    const snaps = await store.getAllSnapshots("t-empty");
    expect(snaps).toEqual([]);
  });

  it("key pattern uses twin:{tenantId}:{resourceId}", async () => {
    const snap = makeSnapshot("tenant-abc", "res-xyz");
    await store.setSnapshot("tenant-abc", "res-xyz", snap);
    // Verify the key is stored correctly by checking the mock store
    const raw = await redis.get("twin:tenant-abc:res-xyz");
    expect(raw).not.toBeNull();
  });
});

// ── AgenticPlanCache tests ────────────────────────────────────────────────────

describe("AgenticPlanCache", () => {
  let redis: MockRedis;
  let cache: AgenticPlanCache;

  beforeEach(() => {
    redis = new MockRedis();
    cache = new AgenticPlanCache(redis as any);
  });

  it("returns null for a cache miss", async () => {
    const result = await cache.lookup("t1", "SCALE_DOWN", "r1", { size: "small" });
    expect(result).toBeNull();
  });

  it("stores and retrieves a plan", async () => {
    const plan = makePlan("t1", "r1");
    await cache.store("t1", plan);
    const retrieved = await cache.lookup("t1", plan.action_type, "r1", plan.parameters);
    expect(retrieved).toEqual(plan);
  });

  it("lookup returns null for different parameters", async () => {
    const plan = makePlan("t1", "r1", "SCALE_DOWN", { target_size: "t3.small" });
    await cache.store("t1", plan);
    const result = await cache.lookup("t1", "SCALE_DOWN", "r1", { target_size: "t3.large" });
    expect(result).toBeNull();
  });

  it("computeActionHash is deterministic", () => {
    const h1 = AgenticPlanCache.computeActionHash("SCALE_DOWN", "r1", { size: "small" });
    const h2 = AgenticPlanCache.computeActionHash("SCALE_DOWN", "r1", { size: "small" });
    expect(h1).toBe(h2);
  });

  it("computeActionHash differs for different inputs", () => {
    const h1 = AgenticPlanCache.computeActionHash("SCALE_DOWN", "r1", { size: "small" });
    const h2 = AgenticPlanCache.computeActionHash("SCALE_DOWN", "r1", { size: "large" });
    expect(h1).not.toBe(h2);
  });

  it("computeActionHash produces a 64-char hex string", () => {
    const h = AgenticPlanCache.computeActionHash("SCALE_DOWN", "r1", {});
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("invalidate removes plans for the given resource", async () => {
    const plan = makePlan("t1", "r1");
    await cache.store("t1", plan);
    await cache.invalidate("t1", "r1");
    const result = await cache.lookup("t1", plan.action_type, "r1", plan.parameters);
    expect(result).toBeNull();
  });

  it("invalidate does not remove plans for other resources", async () => {
    const plan1 = makePlan("t1", "r1");
    const plan2 = makePlan("t1", "r2");
    await cache.store("t1", plan1);
    await cache.store("t1", plan2);
    await cache.invalidate("t1", "r1");

    const result = await cache.lookup("t1", plan2.action_type, "r2", plan2.parameters);
    expect(result).toEqual(plan2);
  });

  it("stores with correct TTL constant", () => {
    expect(PLAN_CACHE_TTL_SECONDS).toBe(7_776_000);
  });

  it("key pattern uses plan_cache:{tenantId}:{hash}", async () => {
    const plan = makePlan("t1", "r1");
    await cache.store("t1", plan);
    const raw = await redis.get(`plan_cache:t1:${plan.action_hash}`);
    expect(raw).not.toBeNull();
  });
});

// ── DoWAccumulator tests ──────────────────────────────────────────────────────

describe("DoWAccumulator", () => {
  let redis: MockRedis;
  let acc: DoWAccumulator;

  beforeEach(() => {
    redis = new MockRedis();
    acc = new DoWAccumulator(redis as any, 1000);
  });

  it("hourBucket formats correctly", () => {
    const d = new Date(Date.UTC(2024, 5, 15, 9, 30, 0)); // 2024-06-15 09:xx UTC
    expect(DoWAccumulator.hourBucket(d)).toBe("2024-06-15-09");
  });

  it("hourBucket pads single-digit month, day, hour", () => {
    const d = new Date(Date.UTC(2024, 0, 5, 3, 0, 0)); // 2024-01-05 03:xx UTC
    expect(DoWAccumulator.hourBucket(d)).toBe("2024-01-05-03");
  });

  it("add returns newTotal and limitExceeded=false when under limit", async () => {
    const result = await acc.add("t1", 100);
    expect(result.newTotal).toBeCloseTo(100);
    expect(result.limitExceeded).toBe(false);
  });

  it("add returns limitExceeded=true when over limit", async () => {
    await acc.add("t1", 900);
    const result = await acc.add("t1", 200);
    expect(result.limitExceeded).toBe(true);
  });

  it("getRollingSum sums multiple adds in the same hour", async () => {
    await acc.add("t1", 50);
    await acc.add("t1", 75);
    const total = await acc.getRollingSum("t1");
    expect(total).toBeCloseTo(125);
  });

  it("getRollingSum returns 0 for a tenant with no data", async () => {
    const total = await acc.getRollingSum("t-empty");
    expect(total).toBe(0);
  });

  it("reset clears all buckets", async () => {
    await acc.add("t1", 500);
    await acc.reset("t1");
    const total = await acc.getRollingSum("t1");
    expect(total).toBe(0);
  });

  it("reset does not affect other tenants", async () => {
    await acc.add("t1", 200);
    await acc.add("t2", 300);
    await acc.reset("t1");
    const t2Total = await acc.getRollingSum("t2");
    expect(t2Total).toBeCloseTo(300);
  });

  it("bucket TTL constant is 25 hours in seconds", () => {
    expect(DOW_BUCKET_TTL_SECONDS).toBe(25 * 60 * 60);
  });

  it("key pattern uses dow:{tenantId}:{bucket}", async () => {
    const bucket = DoWAccumulator.hourBucket();
    await acc.add("t1", 10);
    const raw = await redis.get(`dow:t1:${bucket}`);
    expect(raw).not.toBeNull();
  });
});

// ── AgentHealthRegistry tests ─────────────────────────────────────────────────

describe("AgentHealthRegistry", () => {
  let redis: MockRedis;
  let registry: AgentHealthRegistry;

  beforeEach(() => {
    redis = new MockRedis();
    registry = new AgentHealthRegistry(redis as any);
  });

  it("returns null for an unknown agent", async () => {
    const result = await registry.getHealth("t1", "agent-x");
    expect(result).toBeNull();
  });

  it("stores and retrieves health status", async () => {
    const status = makeHealth("t1", "auditor-1");
    await registry.setHealth("t1", "auditor-1", status);
    const retrieved = await registry.getHealth("t1", "auditor-1");
    expect(retrieved).toEqual(status);
  });

  it("setHealth overwrites existing status", async () => {
    const s1 = makeHealth("t1", "auditor-1");
    const s2 = { ...s1, status: "DEGRADED" as const };
    await registry.setHealth("t1", "auditor-1", s1);
    await registry.setHealth("t1", "auditor-1", s2);
    const retrieved = await registry.getHealth("t1", "auditor-1");
    expect(retrieved?.status).toBe("DEGRADED");
  });

  it("getAllHealth returns all agents for a tenant", async () => {
    await registry.setHealth("t1", "auditor-1", makeHealth("t1", "auditor-1"));
    await registry.setHealth("t1", "governor-1", makeHealth("t1", "governor-1"));
    await registry.setHealth("t2", "auditor-1", makeHealth("t2", "auditor-1")); // different tenant

    const all = await registry.getAllHealth("t1");
    expect(all).toHaveLength(2);
    const ids = all.map((s) => s.agent_id).sort();
    expect(ids).toEqual(["auditor-1", "governor-1"]);
  });

  it("getAllHealth returns empty array when no agents registered", async () => {
    const all = await registry.getAllHealth("t-empty");
    expect(all).toEqual([]);
  });

  it("markUnavailable sets status to UNAVAILABLE", async () => {
    const status = makeHealth("t1", "auditor-1");
    await registry.setHealth("t1", "auditor-1", status);
    await registry.markUnavailable("t1", "auditor-1");
    const retrieved = await registry.getHealth("t1", "auditor-1");
    expect(retrieved?.status).toBe("UNAVAILABLE");
  });

  it("markUnavailable creates a new entry if agent not registered", async () => {
    await registry.markUnavailable("t1", "new-agent");
    const retrieved = await registry.getHealth("t1", "new-agent");
    expect(retrieved).not.toBeNull();
    expect(retrieved?.status).toBe("UNAVAILABLE");
  });

  it("markUnavailable preserves other fields from existing status", async () => {
    const status = makeHealth("t1", "auditor-1");
    await registry.setHealth("t1", "auditor-1", status);
    await registry.markUnavailable("t1", "auditor-1");
    const retrieved = await registry.getHealth("t1", "auditor-1");
    expect(retrieved?.confidence_threshold).toBe(status.confidence_threshold);
    expect(retrieved?.reasoning_accuracy_pct).toBe(status.reasoning_accuracy_pct);
  });

  it("TTL constant is 60 seconds", () => {
    expect(HEALTH_TTL_SECONDS).toBe(60);
  });

  it("key pattern uses health:{tenantId}:{agentId}", async () => {
    const status = makeHealth("t1", "auditor-1");
    await registry.setHealth("t1", "auditor-1", status);
    const raw = await redis.get("health:t1:auditor-1");
    expect(raw).not.toBeNull();
  });
});
