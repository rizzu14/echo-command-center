/**
 * ReasoningRouter — Reasoning Engine
 * Task 59
 */

export type ReasoningTier = 'FAST' | 'MEDIUM' | 'DEEP'

export interface ReasoningTask {
  task_id: string
  tenant_id: string
  risk_score: number          // 0–1
  financial_impact_usd: number
  tenant_config_factor: number // 0–1
}

export interface RoutingDecision {
  task_id: string
  tier: ReasoningTier
  composite_signal: number
  reason: string
}

const FINANCIAL_NORMALIZATION_MAX = 50_000 // $50k

export class ReasoningRouter {
  route(task: ReasoningTask): RoutingDecision {
    const normalized_financial = Math.min(1, task.financial_impact_usd / FINANCIAL_NORMALIZATION_MAX)

    const composite =
      task.risk_score * 0.4 +
      normalized_financial * 0.4 +
      task.tenant_config_factor * 0.2

    let tier: ReasoningTier
    let reason: string

    if (task.financial_impact_usd > 50_000 || composite > 0.60) {
      tier = 'DEEP'
      reason = composite > 0.60
        ? `composite ${composite.toFixed(3)} > 0.60`
        : `financial_impact $${task.financial_impact_usd} > $50,000`
    } else if (
      (composite >= 0.30 && composite <= 0.60) ||
      (task.financial_impact_usd >= 1_000 && task.financial_impact_usd <= 50_000)
    ) {
      tier = 'MEDIUM'
      reason = `composite ${composite.toFixed(3)} in [0.30, 0.60] or financial_impact in [$1k, $50k]`
    } else if (composite < 0.30 && task.financial_impact_usd < 1_000) {
      tier = 'FAST'
      reason = `composite ${composite.toFixed(3)} < 0.30 and financial_impact $${task.financial_impact_usd} < $1,000`
    } else {
      tier = 'MEDIUM'
      reason = 'Default to MEDIUM tier'
    }

    return { task_id: task.task_id, tier, composite_signal: composite, reason }
  }
}
