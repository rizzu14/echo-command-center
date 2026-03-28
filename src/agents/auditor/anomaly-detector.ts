/**
 * AnomalyDetector — Z-score anomaly detection over a 7-day rolling window.
 *
 * Requirements: 1.1, 1.2
 */

import { randomUUID } from 'crypto'
import type { BillingEvent } from '../../infrastructure/kafka/schemas/billing-event.js'
import type { CostLeakageEvent } from '../../infrastructure/kafka/schemas/cost-leakage-event.js'

export interface ThresholdConfig {
  /** Z-score threshold above which an anomaly is triggered */
  z_score_threshold: number
  /** Tenant-specific label */
  tenant_id: string
}

export interface AnomalyDetectionResult {
  triggered: boolean
  z_score: number
  mean: number
  std_dev: number
  event?: CostLeakageEvent
}

/** Rolling window entry keyed by resource_type */
interface WindowEntry {
  costs: number[]
  /** Timestamps (ISO-8601) parallel to costs */
  timestamps: string[]
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

/**
 * AnomalyDetector uses Z-score over a 7-day rolling window per resource type
 * per tenant to detect spend anomalies and emit CostLeakageEvents within 10 seconds.
 */
export class AnomalyDetector {
  /** Map: `${tenantId}:${resourceType}` → rolling window */
  private readonly windows = new Map<string, WindowEntry>()

  /** Callback invoked when an anomaly is detected (≤10 s after detection) */
  private readonly onAnomaly: (event: CostLeakageEvent) => Promise<void>

  constructor(onAnomaly: (event: CostLeakageEvent) => Promise<void>) {
    this.onAnomaly = onAnomaly
  }

  /**
   * Ingest a BillingEvent and check for anomalies.
   * Emits a CostLeakageEvent within 10 seconds if a Z-score breach is detected.
   */
  async ingest(
    billingEvent: BillingEvent,
    thresholdConfig: ThresholdConfig,
  ): Promise<AnomalyDetectionResult> {
    const key = `${billingEvent.tenant_id}:${billingEvent.resource_type}`
    this.ensureWindow(key)
    this.pruneWindow(key, billingEvent.timestamp)

    const window = this.windows.get(key)!
    const { mean, std_dev } = this.computeStats(window.costs)

    const z_score = std_dev > 0
      ? (billingEvent.hourly_cost_usd - mean) / std_dev
      : 0

    // Add current event to window AFTER computing z-score
    window.costs.push(billingEvent.hourly_cost_usd)
    window.timestamps.push(billingEvent.timestamp)

    const triggered = z_score > thresholdConfig.z_score_threshold

    if (!triggered) {
      return { triggered: false, z_score, mean, std_dev }
    }

    const detectionTs = new Date().toISOString()
    const leakageEvent: CostLeakageEvent = {
      event_id: randomUUID(),
      tenant_id: billingEvent.tenant_id,
      resource_id: billingEvent.resource_id,
      anomaly_category: 'USAGE_SPIKE', // default; classifier refines this
      hourly_cost_usd: billingEvent.hourly_cost_usd,
      detection_ts: detectionTs,
      emission_ts: '', // set after emit
      threshold_config: {
        z_score_threshold: thresholdConfig.z_score_threshold,
        mean,
        std_dev,
        z_score,
      },
    }

    // Emit within 10 seconds — synchronous path keeps latency well under limit
    leakageEvent.emission_ts = new Date().toISOString()
    await this.onAnomaly(leakageEvent)

    return { triggered: true, z_score, mean, std_dev, event: leakageEvent }
  }

  /** Seed historical data for a resource type (used during warm-up) */
  seedHistory(
    tenantId: string,
    resourceType: string,
    history: Array<{ cost: number; timestamp: string }>,
  ): void {
    const key = `${tenantId}:${resourceType}`
    this.ensureWindow(key)
    const window = this.windows.get(key)!
    for (const h of history) {
      window.costs.push(h.cost)
      window.timestamps.push(h.timestamp)
    }
  }

  private ensureWindow(key: string): void {
    if (!this.windows.has(key)) {
      this.windows.set(key, { costs: [], timestamps: [] })
    }
  }

  /** Remove entries older than 7 days relative to the given reference timestamp */
  private pruneWindow(key: string, referenceTs: string): void {
    const window = this.windows.get(key)!
    const cutoff = new Date(referenceTs).getTime() - SEVEN_DAYS_MS
    let i = 0
    while (i < window.timestamps.length && new Date(window.timestamps[i]).getTime() < cutoff) {
      i++
    }
    if (i > 0) {
      window.costs.splice(0, i)
      window.timestamps.splice(0, i)
    }
  }

  private computeStats(values: number[]): { mean: number; std_dev: number } {
    if (values.length === 0) return { mean: 0, std_dev: 0 }
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance =
      values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    return { mean, std_dev: Math.sqrt(variance) }
  }
}
