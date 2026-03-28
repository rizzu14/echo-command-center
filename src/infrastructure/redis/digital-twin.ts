/**
 * DigitalTwinStore — Redis-backed store for InfrastructureSnapshot objects.
 *
 * Key pattern: twin:{tenant_id}:{resource_id}
 * No TTL — snapshots are kept until explicitly deleted or overwritten.
 */

import type { RedisClient } from "./client.js";
import type { InfrastructureSnapshot } from "./schema.js";

export class DigitalTwinStore {
  constructor(private readonly redis: RedisClient) {}

  private key(tenantId: string, resourceId: string): string {
    return `twin:${tenantId}:${resourceId}`;
  }

  private scanPattern(tenantId: string): string {
    return `twin:${tenantId}:*`;
  }

  async getSnapshot(
    tenantId: string,
    resourceId: string
  ): Promise<InfrastructureSnapshot | null> {
    const raw = await this.redis.get(this.key(tenantId, resourceId));
    if (!raw) return null;
    return JSON.parse(raw) as InfrastructureSnapshot;
  }

  async setSnapshot(
    tenantId: string,
    resourceId: string,
    snapshot: InfrastructureSnapshot
  ): Promise<void> {
    await this.redis.set(
      this.key(tenantId, resourceId),
      JSON.stringify(snapshot)
    );
  }

  async deleteSnapshot(tenantId: string, resourceId: string): Promise<void> {
    await this.redis.del(this.key(tenantId, resourceId));
  }

  async getAllSnapshots(tenantId: string): Promise<InfrastructureSnapshot[]> {
    const keys = await this.scanKeys(this.scanPattern(tenantId));
    if (keys.length === 0) return [];

    const values = await this.redis.mget(...keys);
    const snapshots: InfrastructureSnapshot[] = [];
    for (const raw of values) {
      if (raw) {
        snapshots.push(JSON.parse(raw) as InfrastructureSnapshot);
      }
    }
    return snapshots;
  }

  /** Scan all keys matching a pattern (handles both standalone and cluster). */
  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];

    // ioredis Cluster exposes scanStream per node; standalone has scanStream directly
    const stream = (this.redis as any).scanStream({ match: pattern, count: 100 });

    await new Promise<void>((resolve, reject) => {
      stream.on("data", (batch: string[]) => keys.push(...batch));
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    return keys;
  }
}
