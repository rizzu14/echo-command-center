/**
 * AgentHealthRegistry — Redis-backed registry for agent health status.
 *
 * Key pattern: health:{tenant_id}:{agent_id}
 * TTL: 60 seconds — agents must heartbeat to stay alive.
 *
 * If an agent misses its heartbeat the key expires and getHealth returns null.
 */

import type { RedisClient } from "./client.js";
import type { AgentHealthStatus } from "./schema.js";

export const HEALTH_TTL_SECONDS = 60;

export class AgentHealthRegistry {
  constructor(private readonly redis: RedisClient) {}

  private key(tenantId: string, agentId: string): string {
    return `health:${tenantId}:${agentId}`;
  }

  private scanPattern(tenantId: string): string {
    return `health:${tenantId}:*`;
  }

  /** Upsert health status and reset the 60-second TTL. */
  async setHealth(
    tenantId: string,
    agentId: string,
    status: AgentHealthStatus
  ): Promise<void> {
    await this.redis.set(
      this.key(tenantId, agentId),
      JSON.stringify(status),
      "EX",
      HEALTH_TTL_SECONDS
    );
  }

  /** Returns null if the agent has not heartbeated within the last 60 seconds. */
  async getHealth(
    tenantId: string,
    agentId: string
  ): Promise<AgentHealthStatus | null> {
    const raw = await this.redis.get(this.key(tenantId, agentId));
    if (!raw) return null;
    return JSON.parse(raw) as AgentHealthStatus;
  }

  /** Returns all agents that have heartbeated within the last 60 seconds. */
  async getAllHealth(tenantId: string): Promise<AgentHealthStatus[]> {
    const keys = await this.scanKeys(this.scanPattern(tenantId));
    if (keys.length === 0) return [];

    const values = await this.redis.mget(...keys);
    const statuses: AgentHealthStatus[] = [];
    for (const raw of values) {
      if (raw) {
        statuses.push(JSON.parse(raw) as AgentHealthStatus);
      }
    }
    return statuses;
  }

  /**
   * Mark an agent as UNAVAILABLE.
   * Writes the status with the standard 60-second TTL so it will still
   * expire if the agent never recovers.
   */
  async markUnavailable(tenantId: string, agentId: string): Promise<void> {
    const existing = await this.getHealth(tenantId, agentId);
    const now = new Date().toISOString();

    const status: AgentHealthStatus = existing
      ? { ...existing, status: "UNAVAILABLE", last_heartbeat: now }
      : {
          agent_id: agentId,
          tenant_id: tenantId,
          status: "UNAVAILABLE",
          last_heartbeat: now,
          action_rate_7d_baseline: 0,
          current_action_rate: 0,
          confidence_threshold: 100,
          consecutive_errors_24h: 0,
          reasoning_accuracy_pct: 0,
          structured_hallucination_rate_pct: 0,
        };

    await this.setHealth(tenantId, agentId, status);
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
