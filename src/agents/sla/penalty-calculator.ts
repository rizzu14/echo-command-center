/**
 * PenaltyCalculator — SLA Prevention Agent
 * Task 30
 */

import type { SLAContract } from './contract-digital-twin.js'

export type BreachSeverity = 'MINOR' | 'MAJOR'

export interface BreachRecord {
  contract_id: string
  metric_name: string
  breach_duration_seconds: number
  magnitude_pct: number
}

export interface PenaltyMath {
  monthly_fee_usd: number
  penalty_pct: number
  severity: BreachSeverity
  formula_string: string
  estimated_penalty_usd: number
}

export interface PenaltyResult {
  contract_id: string
  estimated_penalty_usd: number
  penalty_math: PenaltyMath
}

export class PenaltyCalculator {
  calculate(contract: SLAContract, breach: BreachRecord): PenaltyResult {
    const severity = this._classifySeverity(breach)
    const penalty_pct =
      severity === 'MAJOR'
        ? contract.penalty_schedule.major_pct
        : contract.penalty_schedule.minor_pct
    const monthly_fee_usd = contract.penalty_schedule.monthly_fee_usd
    const estimated_penalty_usd = monthly_fee_usd * (penalty_pct / 100)

    const penalty_math: PenaltyMath = {
      monthly_fee_usd,
      penalty_pct,
      severity,
      formula_string: `penalty = ${monthly_fee_usd} * (${penalty_pct} / 100) = ${estimated_penalty_usd.toFixed(2)}`,
      estimated_penalty_usd,
    }

    return {
      contract_id: contract.contract_id,
      estimated_penalty_usd,
      penalty_math,
    }
  }

  private _classifySeverity(breach: BreachRecord): BreachSeverity {
    // MAJOR if breach duration > 1 hour OR magnitude > 20%
    if (breach.breach_duration_seconds > 3600 || breach.magnitude_pct > 20) return 'MAJOR'
    return 'MINOR'
  }

  projectExposure(contract: SLAContract, proximityPct: number): number {
    const { monthly_fee_usd, major_pct } = contract.penalty_schedule
    // Scale exposure by proximity (0–100%)
    return monthly_fee_usd * (major_pct / 100) * (proximityPct / 100)
  }
}
