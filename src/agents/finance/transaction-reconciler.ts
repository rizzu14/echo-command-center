/**
 * TransactionReconciler — Financial Operations Agent
 * Task 44
 */

export interface ExecutedAction {
  action_id: string
  tenant_id: string
  action_type: string
  projected_cost_usd: number
  executed_at: string
}

export interface BillingRecord {
  record_id: string
  tenant_id: string
  action_id: string
  actual_cost_usd: number
  billed_at: string
}

export interface ReconciliationDiscrepancy {
  action_id: string
  projected_cost_usd: number
  actual_cost_usd: number
  variance_pct: number
  flagged: boolean
}

export interface ReconciliationReport {
  tenant_id: string
  period_from: string
  period_to: string
  total_actions: number
  matched: number
  discrepancies: ReconciliationDiscrepancy[]
  unmatched_action_ids: string[]
  generated_at: string
}

const RECONCILIATION_WINDOW_MS = 24 * 60 * 60 * 1000 // 24 hours
const DISCREPANCY_THRESHOLD_PCT = 5

export class TransactionReconciler {
  reconcile(
    actions: ExecutedAction[],
    billingRecords: BillingRecord[],
    tenantId: string,
  ): ReconciliationReport {
    const now = new Date()
    const windowStart = new Date(now.getTime() - RECONCILIATION_WINDOW_MS)

    const recentActions = actions.filter(
      a => a.tenant_id === tenantId && new Date(a.executed_at) >= windowStart,
    )

    const billingMap = new Map<string, BillingRecord>()
    for (const record of billingRecords) {
      if (record.tenant_id === tenantId) {
        billingMap.set(record.action_id, record)
      }
    }

    const discrepancies: ReconciliationDiscrepancy[] = []
    const unmatched_action_ids: string[] = []
    let matched = 0

    for (const action of recentActions) {
      const billing = billingMap.get(action.action_id)
      if (!billing) {
        unmatched_action_ids.push(action.action_id)
        continue
      }

      matched++
      const variance_pct =
        action.projected_cost_usd !== 0
          ? Math.abs((billing.actual_cost_usd - action.projected_cost_usd) / action.projected_cost_usd) * 100
          : billing.actual_cost_usd > 0 ? 100 : 0

      const flagged = variance_pct > DISCREPANCY_THRESHOLD_PCT

      if (flagged) {
        discrepancies.push({
          action_id: action.action_id,
          projected_cost_usd: action.projected_cost_usd,
          actual_cost_usd: billing.actual_cost_usd,
          variance_pct,
          flagged,
        })
      }
    }

    return {
      tenant_id: tenantId,
      period_from: windowStart.toISOString(),
      period_to: now.toISOString(),
      total_actions: recentActions.length,
      matched,
      discrepancies,
      unmatched_action_ids,
      generated_at: now.toISOString(),
    }
  }
}
