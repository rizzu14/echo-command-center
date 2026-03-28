/**
 * AnomalyClassifier — decision tree that assigns exactly one AnomalyCategory
 * to every detected anomaly.
 *
 * Requirements: 1.4
 */

import type { AnomalyCategory } from '../../infrastructure/kafka/schemas/cost-leakage-event.js'

export interface ClassificationInput {
  /** CPU/memory utilization percentage (0–100) */
  utilization_pct: number
  /** Hours the resource has been active with zero utilization */
  zero_utilization_hours: number
  /** Whether the resource has an associated active workload or owner tag */
  has_active_workload: boolean
  /** Current hourly cost */
  current_hourly_cost_usd: number
  /** Rolling 24-hour average hourly cost */
  rolling_24h_avg_cost_usd: number
  /** Tenant-configured idle threshold in hours */
  idle_threshold_hours: number
  /** Tenant-configured spike threshold as a percentage increase */
  spike_threshold_pct: number
}

export interface ClassificationResult {
  category: AnomalyCategory
  reason: string
}

/**
 * AnomalyClassifier applies a deterministic decision tree to produce exactly
 * one of: IDLE, OVER_PROVISIONED, ORPHANED, USAGE_SPIKE.
 *
 * Decision order (first match wins):
 *  1. ORPHANED   — no active workload or owner tag
 *  2. IDLE       — zero utilization for > idle_threshold_hours
 *  3. USAGE_SPIKE — cost increase > spike_threshold_pct vs 24h average
 *  4. OVER_PROVISIONED — utilization consistently < 20% of provisioned capacity
 */
export class AnomalyClassifier {
  classify(input: ClassificationInput): ClassificationResult {
    // 1. ORPHANED: no associated active workload or owner tag
    if (!input.has_active_workload) {
      return {
        category: 'ORPHANED',
        reason: 'Resource has no associated active workload or owner tag',
      }
    }

    // 2. IDLE: active but zero utilization for > N hours
    if (
      input.utilization_pct === 0 &&
      input.zero_utilization_hours > input.idle_threshold_hours
    ) {
      return {
        category: 'IDLE',
        reason: `Resource has zero utilization for ${input.zero_utilization_hours}h (threshold: ${input.idle_threshold_hours}h)`,
      }
    }

    // 3. USAGE_SPIKE: cost increase > X% vs rolling 24h average
    if (input.rolling_24h_avg_cost_usd > 0) {
      const increasePct =
        ((input.current_hourly_cost_usd - input.rolling_24h_avg_cost_usd) /
          input.rolling_24h_avg_cost_usd) *
        100
      if (increasePct > input.spike_threshold_pct) {
        return {
          category: 'USAGE_SPIKE',
          reason: `Cost increased ${increasePct.toFixed(1)}% vs 24h average (threshold: ${input.spike_threshold_pct}%)`,
        }
      }
    }

    // 4. OVER_PROVISIONED: utilization consistently < 20%
    if (input.utilization_pct < 20) {
      return {
        category: 'OVER_PROVISIONED',
        reason: `Utilization ${input.utilization_pct}% is below 20% of provisioned capacity`,
      }
    }

    // Default fallback — should not normally be reached for anomalous resources
    return {
      category: 'OVER_PROVISIONED',
      reason: 'Anomaly detected but no specific pattern matched; defaulting to OVER_PROVISIONED',
    }
  }
}
