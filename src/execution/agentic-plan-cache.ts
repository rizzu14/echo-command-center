/**
 * AgenticPlanCache — Execution Engine
 * Task 41
 */

import { createHash } from 'crypto'

export interface CachedPlan {
  plan_id: string
  action_type: string
  resource_id: string
  parameters: Record<string, unknown>
  risk_score: number
  simulation_results: unknown
  approval_records: unknown[]
  stored_at: string
  expires_at: string
}

export interface LookupKey {
  action_type: string
  resource_id: string
  parameters: Record<string, unknown>
}

const TTL_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

export class AgenticPlanCache {
  private cache = new Map<string, CachedPlan>()

  private hashKey(action: LookupKey): string {
    const raw = `${action.action_type}:${action.resource_id}:${JSON.stringify(action.parameters)}`
    return createHash('sha256').update(raw).digest('hex')
  }

  lookup(action: LookupKey): CachedPlan | null {
    const key = this.hashKey(action)
    const plan = this.cache.get(key)
    if (!plan) return null
    if (new Date(plan.expires_at) < new Date()) {
      this.cache.delete(key)
      return null
    }
    return plan
  }

  store(plan: Omit<CachedPlan, 'stored_at' | 'expires_at'>): CachedPlan {
    const key = this.hashKey({
      action_type: plan.action_type,
      resource_id: plan.resource_id,
      parameters: plan.parameters,
    })
    const now = new Date()
    const stored: CachedPlan = {
      ...plan,
      stored_at: now.toISOString(),
      expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
    }
    this.cache.set(key, stored)
    return stored
  }

  invalidate(resourceId: string): number {
    let count = 0
    for (const [key, plan] of this.cache.entries()) {
      if (plan.resource_id === resourceId) {
        this.cache.delete(key)
        count++
      }
    }
    return count
  }

  size(): number {
    return this.cache.size
  }
}
