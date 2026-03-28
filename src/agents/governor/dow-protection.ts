/**
 * DoWAccumulator — 24-hour rolling window spend accumulator with kill-switch integration.
 *
 * Requirements: 4.4, 5.3
 */

export interface TenantDoWConfig {
  tenant_id: string
  dow_protection_limit_usd: number
}

export interface DoWAddResult {
  rollingSum: number
  limitExceeded: boolean
  bucketKey: string
}

export interface DoWDependencies {
  /** Auto-activate kill-switch when limit is exceeded */
  activateKillSwitch(tenantId: string, activatedBy: string, reason: string): Promise<void>
  /** Notify tenant administrators */
  notifyAdmins(tenantId: string, message: string): Promise<void>
}

/** Format a Date as "YYYY-MM-DD-HH" in UTC */
function hourBucket(date: Date = new Date()): string {
  const y = date.getUTCFullYear()
  const mo = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const h = String(date.getUTCHours()).padStart(2, '0')
  return `${y}-${mo}-${d}-${h}`
}

/**
 * DoWAccumulator maintains a 24-hour rolling window using hourly buckets.
 * When the rolling sum exceeds the tenant's DoW protection limit, it
 * auto-activates the kill-switch and notifies administrators.
 *
 * This is an in-memory implementation; production would back this with Redis
 * (see src/infrastructure/redis/dow-accumulator.ts).
 */
export class DoWAccumulator {
  /** Map: `${tenantId}:${hourBucket}` → accumulated USD */
  private readonly buckets = new Map<string, number>()

  private readonly deps: DoWDependencies

  constructor(deps: DoWDependencies) {
    this.deps = deps
  }

  /**
   * Add amountUsd to the current hour bucket for the tenant.
   * Computes the rolling sum of the last 24 buckets.
   * If rollingSum > limit, auto-activates kill-switch.
   */
  async add(
    tenantId: string,
    amountUsd: number,
    config: TenantDoWConfig,
    now: Date = new Date(),
  ): Promise<DoWAddResult> {
    const bucket = hourBucket(now)
    const key = `${tenantId}:${bucket}`

    const current = this.buckets.get(key) ?? 0
    this.buckets.set(key, current + amountUsd)

    const rolling = this.rollingSum(tenantId, now)
    const limitExceeded = rolling > config.dow_protection_limit_usd

    if (limitExceeded) {
      await this.deps.activateKillSwitch(
        tenantId,
        'SYSTEM_DOW',
        `DoW protection limit exceeded: $${rolling.toFixed(2)} > $${config.dow_protection_limit_usd}`,
      )
      await this.deps.notifyAdmins(
        tenantId,
        `DoW protection limit of $${config.dow_protection_limit_usd} exceeded. Current 24h spend: $${rolling.toFixed(2)}`,
      )
    }

    return { rollingSum: rolling, limitExceeded, bucketKey: bucket }
  }

  /**
   * Compute the rolling sum of the last 24 hourly buckets (inclusive of current hour).
   * The accumulator is monotonically increasing within the 24h window.
   */
  rollingSum(tenantId: string, now: Date = new Date()): number {
    let total = 0
    for (let i = 0; i < 24; i++) {
      const t = new Date(now.getTime() - i * 60 * 60 * 1000)
      const key = `${tenantId}:${hourBucket(t)}`
      total += this.buckets.get(key) ?? 0
    }
    return total
  }

  /** Reset all buckets for a tenant (hard reset at window boundary) */
  reset(tenantId: string): void {
    for (const key of this.buckets.keys()) {
      if (key.startsWith(`${tenantId}:`)) {
        this.buckets.delete(key)
      }
    }
  }

  /** Expose hourBucket as a static utility */
  static hourBucket = hourBucket
}
