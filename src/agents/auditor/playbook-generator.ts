/**
 * PlaybookGenerator — converts CostLeakageEvents into structured remediation playbooks.
 *
 * Requirements: 1.2, 1.3
 */

import { randomUUID } from 'crypto'
import type { CostLeakageEvent } from '../../infrastructure/kafka/schemas/cost-leakage-event.js'

export interface PlaybookAction {
  action_type: string
  target_resource: string
  parameters: Record<string, unknown>
  /** Inline cost impact formula as a human-readable string */
  cost_impact_formula: string
  estimated_savings_usd: number
}

export interface Playbook {
  playbook_id: string
  tenant_id: string
  /** Reference to the originating CostLeakageEvent */
  anomaly_ref: string
  recommended_actions: PlaybookAction[]
  cost_impact_math: {
    current_hourly_cost: number
    optimized_hourly_cost: number
    hours_per_month: number
    projected_monthly_savings_usd: number
    formula_string: string
  }
  estimated_savings_usd: number
  confidence_score: number
  created_at: string
}

/** Action templates per anomaly category */
const ACTION_TEMPLATES: Record<
  CostLeakageEvent['anomaly_category'],
  (event: CostLeakageEvent) => PlaybookAction[]
> = {
  IDLE: (event) => [
    {
      action_type: 'STOP_RESOURCE',
      target_resource: event.resource_id,
      parameters: { reason: 'zero_utilization', idle_hours: event.threshold_config['idle_hours'] },
      cost_impact_formula: `savings = ${event.hourly_cost_usd} * hours_per_month`,
      estimated_savings_usd: event.hourly_cost_usd * 720,
    },
  ],
  OVER_PROVISIONED: (event) => [
    {
      action_type: 'DOWNSIZE_RESOURCE',
      target_resource: event.resource_id,
      parameters: { target_utilization_pct: 70, current_utilization_pct: event.threshold_config['utilization_pct'] },
      cost_impact_formula: `savings = (current_cost - rightsized_cost) * hours_per_month`,
      estimated_savings_usd: event.hourly_cost_usd * 0.4 * 720,
    },
  ],
  ORPHANED: (event) => [
    {
      action_type: 'TERMINATE_RESOURCE',
      target_resource: event.resource_id,
      parameters: { reason: 'no_active_workload_or_owner' },
      cost_impact_formula: `savings = ${event.hourly_cost_usd} * hours_per_month`,
      estimated_savings_usd: event.hourly_cost_usd * 720,
    },
  ],
  USAGE_SPIKE: (event) => [
    {
      action_type: 'INVESTIGATE_SPIKE',
      target_resource: event.resource_id,
      parameters: { spike_details: event.threshold_config },
      cost_impact_formula: `savings = (spike_cost - baseline_cost) * hours_per_month`,
      estimated_savings_usd:
        (event.hourly_cost_usd - ((event.threshold_config['mean'] as number) ?? 0)) * 720,
    },
    {
      action_type: 'SET_BUDGET_ALERT',
      target_resource: event.resource_id,
      parameters: { threshold_usd: event.hourly_cost_usd * 1.1 },
      cost_impact_formula: `alert_threshold = current_cost * 1.1`,
      estimated_savings_usd: 0,
    },
  ],
}

/** Confidence scores per anomaly category (0–1) */
const CONFIDENCE_BY_CATEGORY: Record<CostLeakageEvent['anomaly_category'], number> = {
  IDLE: 0.95,
  ORPHANED: 0.90,
  OVER_PROVISIONED: 0.80,
  USAGE_SPIKE: 0.70,
}

const HOURS_PER_MONTH = 720

/**
 * PlaybookGenerator converts a CostLeakageEvent into a structured remediation
 * playbook with cost impact math and recommended actions.
 */
export class PlaybookGenerator {
  generate(event: CostLeakageEvent, optimizedHourlyCostUsd?: number): Playbook {
    const actions = ACTION_TEMPLATES[event.anomaly_category](event)
    const optimized = optimizedHourlyCostUsd ?? event.hourly_cost_usd * 0.5
    const monthlySavings = (event.hourly_cost_usd - optimized) * HOURS_PER_MONTH

    const costImpactMath = {
      current_hourly_cost: event.hourly_cost_usd,
      optimized_hourly_cost: optimized,
      hours_per_month: HOURS_PER_MONTH,
      projected_monthly_savings_usd: monthlySavings,
      formula_string: `savings = (${event.hourly_cost_usd} - ${optimized}) * ${HOURS_PER_MONTH} = ${monthlySavings.toFixed(2)}`,
    }

    return {
      playbook_id: randomUUID(),
      tenant_id: event.tenant_id,
      anomaly_ref: event.event_id,
      recommended_actions: actions,
      cost_impact_math: costImpactMath,
      estimated_savings_usd: monthlySavings,
      confidence_score: CONFIDENCE_BY_CATEGORY[event.anomaly_category],
      created_at: new Date().toISOString(),
    }
  }
}
