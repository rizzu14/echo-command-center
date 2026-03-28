/**
 * ROIEngine — Financial Operations Agent
 * Task 43
 */

export interface ROIInput {
  cost_savings_usd: number
  execution_cost_usd: number
  reasoning_cost_usd: number
  avoided_loss_usd: number
  platform_cost_usd: number
}

export interface ROIResult {
  net_roi_pct: number
  cost_savings_usd: number
  execution_cost_usd: number
  reasoning_cost_usd: number
  avoided_loss_usd: number
  platform_cost_usd: number
  formula_string: string
}

export interface ReasoningSession {
  session_id: string
  tenant_id: string
  cost_usd: number
  correct: boolean
  timestamp: string
}

export interface ProposedActionForROI {
  action_id: string
  action_type: string
  projected_savings_usd: number
  estimated_execution_cost_usd: number
  estimated_reasoning_cost_usd: number
  avoided_loss_usd: number
  platform_cost_usd: number
}

export interface ROIDeviation {
  action_id: string
  projected_roi_pct: number
  actual_roi_pct: number
  deviation_pct: number
  is_reasoning_error_candidate: boolean
}

export class ROIEngine {
  private sessions: ReasoningSession[] = []

  calculate(input: ROIInput): ROIResult {
    const { cost_savings_usd, execution_cost_usd, reasoning_cost_usd, avoided_loss_usd, platform_cost_usd } = input
    if (platform_cost_usd === 0) throw new Error('platform_cost_usd must be non-zero')

    const net_roi_pct =
      ((cost_savings_usd - execution_cost_usd - reasoning_cost_usd + avoided_loss_usd) / platform_cost_usd) * 100

    return {
      net_roi_pct,
      cost_savings_usd,
      execution_cost_usd,
      reasoning_cost_usd,
      avoided_loss_usd,
      platform_cost_usd,
      formula_string: `net_roi_pct = (${cost_savings_usd} - ${execution_cost_usd} - ${reasoning_cost_usd} + ${avoided_loss_usd}) / ${platform_cost_usd} * 100 = ${net_roi_pct.toFixed(2)}%`,
    }
  }

  recordSession(session: ReasoningSession): void {
    this.sessions.push(session)
  }

  costPerCorrectResult(tenantId: string, period?: { from: string; to: string }): number {
    let filtered = this.sessions.filter(s => s.tenant_id === tenantId)
    if (period) {
      filtered = filtered.filter(
        s => s.timestamp >= period.from && s.timestamp <= period.to,
      )
    }
    const correctSessions = filtered.filter(s => s.correct)
    if (correctSessions.length === 0) return 0
    const totalCost = filtered.reduce((sum, s) => sum + s.cost_usd, 0)
    return totalCost / correctSessions.length
  }

  avoidedLoss(tenantId: string, period?: { from: string; to: string }): number {
    // Sum of abs(projected_negative_impact) for blocked actions
    // In this implementation, sessions track avoided loss via metadata
    return 0 // Placeholder — real impl would query blocked actions
  }

  projectROI(action: ProposedActionForROI): ROIResult {
    return this.calculate({
      cost_savings_usd: action.projected_savings_usd,
      execution_cost_usd: action.estimated_execution_cost_usd,
      reasoning_cost_usd: action.estimated_reasoning_cost_usd,
      avoided_loss_usd: action.avoided_loss_usd,
      platform_cost_usd: action.platform_cost_usd,
    })
  }

  compareOutcome(
    action: ProposedActionForROI,
    actualROI: number,
  ): ROIDeviation {
    const projected = this.projectROI(action)
    const deviation_pct =
      projected.net_roi_pct !== 0
        ? Math.abs((actualROI - projected.net_roi_pct) / projected.net_roi_pct) * 100
        : Math.abs(actualROI) * 100

    return {
      action_id: action.action_id,
      projected_roi_pct: projected.net_roi_pct,
      actual_roi_pct: actualROI,
      deviation_pct,
      is_reasoning_error_candidate: deviation_pct > 15,
    }
  }
}
