/**
 * HallucinationDetector — Reasoning Engine
 * Task 61
 */

export interface FactualClaim {
  claim_id: string
  text: string
  source_hint?: string
}

export interface DataSource {
  source_id: string
  data: Record<string, unknown>
  verify(claim: FactualClaim): boolean
}

export type ClaimStatus = 'VERIFIED' | 'UNVERIFIED'

export interface AnnotatedClaim extends FactualClaim {
  status: ClaimStatus
  confidence_reduction: number
}

export interface ValidationResult {
  original_confidence: number
  adjusted_confidence: number
  annotated_claims: AnnotatedClaim[]
  unverified_count: number
  verified_count: number
}

export interface AgentHallucinationStats {
  agent_id: string
  total_claims: number
  unverified_claims: number
  structured_hallucination_rate_pct: number
}

export class HallucinationDetector {
  private stats = new Map<string, { total: number; unverified: number }>()

  validateClaims(
    output: { claims: FactualClaim[]; confidence: number; agent_id?: string },
    dataSources: DataSource[],
  ): ValidationResult {
    const annotated: AnnotatedClaim[] = []
    let confidence = output.confidence

    for (const claim of output.claims) {
      const verified = dataSources.some(ds => ds.verify(claim))
      if (verified) {
        annotated.push({ ...claim, status: 'VERIFIED', confidence_reduction: 0 })
      } else {
        annotated.push({ ...claim, status: 'UNVERIFIED', confidence_reduction: 20 })
        confidence = Math.max(0, confidence - 20)
      }
    }

    // Track stats per agent
    if (output.agent_id) {
      const existing = this.stats.get(output.agent_id) ?? { total: 0, unverified: 0 }
      existing.total += output.claims.length
      existing.unverified += annotated.filter(c => c.status === 'UNVERIFIED').length
      this.stats.set(output.agent_id, existing)
    }

    return {
      original_confidence: output.confidence,
      adjusted_confidence: confidence,
      annotated_claims: annotated,
      unverified_count: annotated.filter(c => c.status === 'UNVERIFIED').length,
      verified_count: annotated.filter(c => c.status === 'VERIFIED').length,
    }
  }

  getHallucinationRate(agentId: string): AgentHallucinationStats {
    const s = this.stats.get(agentId) ?? { total: 0, unverified: 0 }
    return {
      agent_id: agentId,
      total_claims: s.total,
      unverified_claims: s.unverified,
      structured_hallucination_rate_pct: s.total > 0 ? (s.unverified / s.total) * 100 : 0,
    }
  }
}
