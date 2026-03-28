/**
 * ApprovalRouter — Execution Engine
 * Task 38
 */

import type { ApprovalState, ScoredAction } from './risk-scorer.js'
import type { AgenticPlanCache } from './agentic-plan-cache.js'

export interface TenantConfig {
  tenant_id: string
  min_confidence: number
}

export interface RoutableAction {
  action_id: string
  action_type: string
  resource_id: string
  parameters: Record<string, unknown>
  risk_score: number
  confidence_threshold: number
  projected_roi: number
}

export interface RoutingResult {
  action_id: string
  approval_state: ApprovalState
  reason: string
}

export class ApprovalRouter {
  constructor(
    private tenantConfig: TenantConfig,
    private planCache?: AgenticPlanCache,
  ) {}

  async route(action: RoutableAction): Promise<RoutingResult> {
    // Rule 1: high risk → require human approval
    if (action.risk_score > 70) {
      return {
        action_id: action.action_id,
        approval_state: 'REQUIRE_HUMAN_APPROVAL',
        reason: `risk_score ${action.risk_score} > 70`,
      }
    }

    // Rule 2: low confidence → queue for human review
    if (action.confidence_threshold < this.tenantConfig.min_confidence) {
      return {
        action_id: action.action_id,
        approval_state: 'QUEUE_FOR_HUMAN_REVIEW',
        reason: `confidence_threshold ${action.confidence_threshold} < min_confidence ${this.tenantConfig.min_confidence}`,
      }
    }

    // Rule 3: negative ROI → flag for human review
    if (action.projected_roi < 0) {
      return {
        action_id: action.action_id,
        approval_state: 'FLAG_FOR_HUMAN_REVIEW',
        reason: `projected_roi ${action.projected_roi} < 0`,
      }
    }

    // Rule 4: cached plan with low risk → auto execute cached
    if (this.planCache) {
      const cached = await this.planCache.lookup(action)
      if (cached && action.risk_score < 30) {
        return {
          action_id: action.action_id,
          approval_state: 'AUTO_EXECUTE_CACHED',
          reason: 'Matches cached plan and risk_score < 30',
        }
      }
    }

    // Rule 5: default → auto execute
    return {
      action_id: action.action_id,
      approval_state: 'AUTO_EXECUTE',
      reason: 'All checks passed',
    }
  }
}
