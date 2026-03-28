/**
 * VarianceAnalyzer — Financial Operations Agent
 * Task 45
 */

import type { ReconciliationReport, ReconciliationDiscrepancy } from './transaction-reconciler.js'

export type RootCauseCategory =
  | 'model_error'
  | 'data_staleness'
  | 'infrastructure_change'
  | 'external_factor'

export interface RootCauseAttribution {
  category: RootCauseCategory
  confidence: number
  explanation: string
}

export interface EnrichedDiscrepancy extends ReconciliationDiscrepancy {
  root_cause_attribution: RootCauseAttribution
}

export interface EnrichedReconciliationReport extends ReconciliationReport {
  discrepancies: EnrichedDiscrepancy[]
  root_cause_summary: Record<RootCauseCategory, number>
}

export class VarianceAnalyzer {
  analyze(report: ReconciliationReport): EnrichedReconciliationReport {
    const enrichedDiscrepancies: EnrichedDiscrepancy[] = report.discrepancies.map(d => ({
      ...d,
      root_cause_attribution: this._attributeRootCause(d),
    }))

    const root_cause_summary: Record<RootCauseCategory, number> = {
      model_error: 0,
      data_staleness: 0,
      infrastructure_change: 0,
      external_factor: 0,
    }

    for (const d of enrichedDiscrepancies) {
      root_cause_summary[d.root_cause_attribution.category]++
    }

    return {
      ...report,
      discrepancies: enrichedDiscrepancies,
      root_cause_summary,
    }
  }

  private _attributeRootCause(discrepancy: ReconciliationDiscrepancy): RootCauseAttribution {
    const { variance_pct, projected_cost_usd, actual_cost_usd } = discrepancy

    // Heuristic attribution based on variance magnitude and direction
    if (variance_pct > 50) {
      return {
        category: 'infrastructure_change',
        confidence: 0.7,
        explanation: `Large variance (${variance_pct.toFixed(1)}%) suggests infrastructure configuration changed`,
      }
    }

    if (actual_cost_usd > projected_cost_usd * 1.1) {
      return {
        category: 'external_factor',
        confidence: 0.6,
        explanation: `Actual cost exceeded projection by ${variance_pct.toFixed(1)}%, likely external pricing change`,
      }
    }

    if (variance_pct > 15) {
      return {
        category: 'model_error',
        confidence: 0.65,
        explanation: `Variance of ${variance_pct.toFixed(1)}% suggests reasoning model prediction error`,
      }
    }

    return {
      category: 'data_staleness',
      confidence: 0.55,
      explanation: `Minor variance (${variance_pct.toFixed(1)}%) consistent with stale pricing data`,
    }
  }
}
