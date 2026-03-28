/**
 * CostTracker — Reasoning Engine
 * Task 63
 */

export interface ReasoningSessionCost {
  session_id: string
  tenant_id: string
  cost_usd: number
  correct: boolean
  timestamp: string
}

export interface BudgetConfig {
  max_reasoning_budget_usd: number
}

export interface CostSummary {
  total_cost_usd: number
  correct_sessions: number
  total_sessions: number
  cost_per_correct_result: number
}

export interface PartialResult<T> {
  result: T | null
  budget_exhausted: boolean
  completeness_pct: number
  cost_incurred_usd: number
}

export class CostTracker {
  private sessions: ReasoningSessionCost[] = []
  private spentByTenant = new Map<string, number>()

  recordSession(session: ReasoningSessionCost): void {
    this.sessions.push(session)
    const current = this.spentByTenant.get(session.tenant_id) ?? 0
    this.spentByTenant.set(session.tenant_id, current + session.cost_usd)
  }

  costPerCorrectResult(tenantId?: string): number {
    const filtered = tenantId
      ? this.sessions.filter(s => s.tenant_id === tenantId)
      : this.sessions

    const correctSessions = filtered.filter(s => s.correct)
    if (correctSessions.length === 0) return 0

    const totalCost = filtered.reduce((sum, s) => sum + s.cost_usd, 0)
    // Never negative
    return Math.max(0, totalCost / correctSessions.length)
  }

  getSpent(tenantId: string): number {
    return this.spentByTenant.get(tenantId) ?? 0
  }

  checkBudget(tenantId: string, budget: BudgetConfig): {
    exhausted: boolean
    remaining_usd: number
    completeness_pct: number
  } {
    const spent = this.getSpent(tenantId)
    const remaining = Math.max(0, budget.max_reasoning_budget_usd - spent)
    const exhausted = spent >= budget.max_reasoning_budget_usd
    const completeness_pct = Math.min(100, (spent / budget.max_reasoning_budget_usd) * 100)

    return { exhausted, remaining_usd: remaining, completeness_pct }
  }

  async runWithBudget<T>(
    tenantId: string,
    budget: BudgetConfig,
    work: (remainingBudget: number) => Promise<{ result: T; cost_usd: number }>,
  ): Promise<PartialResult<T>> {
    const { exhausted, remaining_usd } = this.checkBudget(tenantId, budget)

    if (exhausted) {
      return {
        result: null,
        budget_exhausted: true,
        completeness_pct: 100,
        cost_incurred_usd: 0,
      }
    }

    try {
      const { result, cost_usd } = await work(remaining_usd)
      this.recordSession({
        session_id: `session-${Date.now()}`,
        tenant_id: tenantId,
        cost_usd,
        correct: true,
        timestamp: new Date().toISOString(),
      })

      const { completeness_pct } = this.checkBudget(tenantId, budget)
      return {
        result,
        budget_exhausted: this.getSpent(tenantId) >= budget.max_reasoning_budget_usd,
        completeness_pct: 100 - completeness_pct,
        cost_incurred_usd: cost_usd,
      }
    } catch {
      return {
        result: null,
        budget_exhausted: true,
        completeness_pct: 0,
        cost_incurred_usd: 0,
      }
    }
  }

  getSummary(tenantId?: string): CostSummary {
    const filtered = tenantId
      ? this.sessions.filter(s => s.tenant_id === tenantId)
      : this.sessions

    return {
      total_cost_usd: filtered.reduce((sum, s) => sum + s.cost_usd, 0),
      correct_sessions: filtered.filter(s => s.correct).length,
      total_sessions: filtered.length,
      cost_per_correct_result: this.costPerCorrectResult(tenantId),
    }
  }
}
