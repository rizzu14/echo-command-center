/**
 * DoWAccumulator — Redis-backed rolling 24-hour spend accumulator.
 *
 * Key pattern: dow:{tenant_id}:{hour_bucket}
 * Hour bucket format: "YYYY-MM-DD-HH" (UTC)
 * Each bucket TTL: 25 hours (auto-expires after the rolling window)
 *
 * getRollingSum sums the last 24 hourly buckets.
 */

import type { RedisClient } from "./client.js";

export const DOW_BUCKET_TTL_SECONDS = 25 * 60 * 60; // 25 hours

export interface AddResult {
  newTotal: number;
  limitExceeded: boolean;
}

export class DoWAccumulator {
  constructor(
    private readonly redis: RedisClient,
    /** Optional per-tenant limit in USD. Pass Infinity to disable. */
    private readonly limitUsd: number = Infinity
  ) {}

  /** Format a Date as "YYYY-MM-DD-HH" in UTC. */
  static hourBucket(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
    const d = String(date.getUTCDate()).padStart(2, "0");
    const h = String(date.getUTCHours()).padStart(2, "0");
    return `${y}-${mo}-${d}-${h}`;
  }

  private key(tenantId: string, bucket: string): string {
    return `dow:${tenantId}:${bucket}`;
  }

  /** Add amountUsd to the current hour bucket and return the rolling 24h total. */
  async add(tenantId: string, amountUsd: number): Promise<AddResult> {
    const bucket = DoWAccumulator.hourBucket();
    const key = this.key(tenantId, bucket);

    // Increment and set TTL atomically via pipeline
    const pipeline = this.redis.pipeline();
    pipeline.incrbyfloat(key, amountUsd);
    pipeline.expire(key, DOW_BUCKET_TTL_SECONDS);
    await pipeline.exec();

    const newTotal = await this.getRollingSum(tenantId);
    return { newTotal, limitExceeded: newTotal > this.limitUsd };
  }

  /** Sum the last 24 hourly buckets (inclusive of current hour). */
  async getRollingSum(tenantId: string): Promise<number> {
    const now = new Date();
    const keys: string[] = [];

    for (let i = 0; i < 24; i++) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000);
      keys.push(this.key(tenantId, DoWAccumulator.hourBucket(t)));
    }

    const values = await this.redis.mget(...keys);
    let total = 0;
    for (const v of values) {
      if (v !== null) total += parseFloat(v);
    }
    return total;
  }

  /** Delete all hourly buckets for a tenant (hard reset). */
  async reset(tenantId: string): Promise<void> {
    const now = new Date();
    const keys: string[] = [];

    for (let i = 0; i < 24; i++) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000);
      keys.push(this.key(tenantId, DoWAccumulator.hourBucket(t)));
    }

    await this.redis.del(...keys);
  }
}
