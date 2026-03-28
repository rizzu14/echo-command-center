/**
 * AgenticPlanCache — Redis-backed cache for validated execution plans.
 *
 * Key pattern: plan_cache:{tenant_id}:{action_hash}
 * TTL: 90 days = 7,776,000 seconds
 *
 * Action hash = SHA-256(actionType + resourceId + JSON.stringify(parameters))
 */

import crypto from "crypto";
import type { RedisClient } from "./client.js";
import type { CachedPlan } from "./schema.js";

export const PLAN_CACHE_TTL_SECONDS = 7_776_000; // 90 days

export class AgenticPlanCache {
  constructor(private readonly redis: RedisClient) {}

  /** Compute the action hash used as the cache key suffix. */
  static computeActionHash(
    actionType: string,
    resourceId: string,
    parameters: Record<string, unknown>
  ): string {
    return crypto
      .createHash("sha256")
      .update(actionType + resourceId + JSON.stringify(parameters))
      .digest("hex");
  }

  private key(tenantId: string, actionHash: string): string {
    return `plan_cache:${tenantId}:${actionHash}`;
  }

  private scanPattern(tenantId: string, resourceId: string): string {
    // We can't embed resourceId in the key directly (hash obscures it),
    // so we scan all plans for the tenant and filter by resourceId.
    return `plan_cache:${tenantId}:*`;
  }

  async lookup(
    tenantId: string,
    actionType: string,
    resourceId: string,
    parameters: Record<string, unknown>
  ): Promise<CachedPlan | null> {
    const hash = AgenticPlanCache.computeActionHash(actionType, resourceId, parameters);
    const raw = await this.redis.get(this.key(tenantId, hash));
    if (!raw) return null;
    return JSON.parse(raw) as CachedPlan;
  }

  async store(tenantId: string, plan: CachedPlan): Promise<void> {
    const key = this.key(tenantId, plan.action_hash);
    await this.redis.set(key, JSON.stringify(plan), "EX", PLAN_CACHE_TTL_SECONDS);
  }

  /** Invalidate all cached plans for a given resource within a tenant. */
  async invalidate(tenantId: string, resourceId: string): Promise<void> {
    const keys = await this.scanKeys(this.scanPattern(tenantId, resourceId));
    if (keys.length === 0) return;

    // Filter to only plans belonging to this resourceId
    const toDelete: string[] = [];
    const values = await this.redis.mget(...keys);
    for (let i = 0; i < keys.length; i++) {
      const raw = values[i];
      if (raw) {
        const plan = JSON.parse(raw) as CachedPlan;
        if (plan.resource_id === resourceId) {
          toDelete.push(keys[i]);
        }
      }
    }

    if (toDelete.length > 0) {
      await this.redis.del(...toDelete);
    }
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    const stream = (this.redis as any).scanStream({ match: pattern, count: 100 });

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (batch: string[]) => keys.push(...batch));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    return keys;
  }
}
