/**
 * RiskScorer — Execution Engine
 * Task 37
 */

import type { ProposedAction, SimulationResult } from './digital-twin.js'

export interface ScoredAction {
  action_id: string
  risk_score: number          // 0–100
  confidence_threshold: number // 0–100
  approval_state?: ApprovalState
}

export type ApprovalState =
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'QUEUE_FOR_HUMAN_REVIEW'
  | 'FLAG_FOR_HUMAN_REVIEW'
  | 'AUTO_EXECUTE_CACHED'
  | 'AUTO_EXECUTE'

export interface RiskScoreComponents {
  blast_radius_score: number
  reversibility_score: number
  confidence_score: number
  financial_score: number
  risk_score: number
  confidence_threshold: number
}

export class RiskScorer {
  score(action: ProposedAction, simulation: SimulationResult): RiskScoreComponents {
    const ri = simulation.risk_indicators

    // Normalize each component to 0–1
    const blast_radius_score = Math.min(1, ri.blast_radius / 10)
    // Reversibility: lower reversibility = higher risk
    const reversibility_score = 1 - Math.min(1, ri.reversibility)
    // Confidence: lower confidence = higher risk
    const confidence_score = 1 - Math.min(1, ri.confidence)
    // Financial: normalize against $10k/month as reference
    const financial_score = Math.min(1, Math.abs(ri.financial_impact) / 10000)

    const weighted_sum =
      blast_radius_score * 0.30 +
      reversibility_score * 0.25 +
      confidence_score * 0.25 +
      financial_score * 0.20

    const risk_score = Math.round(Math.min(100, Math.max(0, weighted_sum * 100)))
    const confidence_threshold = Math.round(Math.min(100, Math.max(0, ri.confidence * 100)))

    return {
      blast_radius_score,
      reversibility_score,
      confidence_score,
      financial_score,
      risk_score,
      confidence_threshold,
    }
  }
}
