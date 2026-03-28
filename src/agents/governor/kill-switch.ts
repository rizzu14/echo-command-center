/**
 * KillSwitchCircuitBreaker — CLOSED → OPEN → HALF_OPEN state machine.
 *
 * Requirements: 5.3, 5.4
 */

import { randomUUID } from 'crypto'
import type { GovernanceEvent } from '../../infrastructure/kafka/schemas/governance-event.js'
import type { LedgerWriteEvent } from '../../infrastructure/kafka/schemas/ledger-write-event.js'

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface KillSwitchActivation {
  tenant_id: string
  activated_by: string
  activated_at: string
  reason?: string
}

export interface KillSwitchStatus {
  state: CircuitState
  tenant_id: string
  last_activation?: KillSwitchActivation
}

export interface KillSwitchDependencies {
  /** Publish a GovernanceEvent to governance.kill_switch topic */
  publishKillSwitch(event: GovernanceEvent): Promise<void>
  /** Write an entry to the Liquid_Ledger */
  writeLedger(event: LedgerWriteEvent): Promise<void>
  /** Poll agent status; returns true if agent has confirmed halt */
  pollAgentHalt(tenantId: string, agentId: string): Promise<boolean>
  /** Notify tenant administrators */
  notifyAdmins(tenantId: string, message: string): Promise<void>
}

const HALT_CONFIRM_TIMEOUT_MS = 5000

/**
 * KillSwitchCircuitBreaker manages the kill-switch lifecycle:
 *  CLOSED  — normal operation
 *  OPEN    — all agent execution rejected
 *  HALF_OPEN — health verification in progress before returning to CLOSED
 */
export class KillSwitchCircuitBreaker {
  private readonly states = new Map<string, CircuitState>()
  private readonly activations = new Map<string, KillSwitchActivation>()
  private readonly deps: KillSwitchDependencies

  constructor(deps: KillSwitchDependencies) {
    this.deps = deps
  }

  getState(tenantId: string): CircuitState {
    return this.states.get(tenantId) ?? 'CLOSED'
  }

  getStatus(tenantId: string): KillSwitchStatus {
    return {
      state: this.getState(tenantId),
      tenant_id: tenantId,
      last_activation: this.activations.get(tenantId),
    }
  }

  /**
   * Activate the kill-switch for a tenant.
   * Sets state to OPEN, publishes to governance.kill_switch with CRITICAL priority,
   * logs to Liquid_Ledger, and polls agents for halt confirmation within 5 seconds.
   */
  async activate(
    tenantId: string,
    userId: string,
    agentIds: string[] = [],
    reason?: string,
  ): Promise<void> {
    const now = new Date().toISOString()
    const activation: KillSwitchActivation = {
      tenant_id: tenantId,
      activated_by: userId,
      activated_at: now,
      reason,
    }

    this.states.set(tenantId, 'OPEN')
    this.activations.set(tenantId, activation)

    const governanceEvent: GovernanceEvent = {
      event_id: randomUUID(),
      tenant_id: tenantId,
      event_type: 'KILL_SWITCH_ACTIVATED',
      payload: {
        activated_by: userId,
        activated_at: now,
        reason: reason ?? 'manual',
        priority: 'CRITICAL',
      },
      timestamp: now,
    }

    // Publish to kill_switch topic (CRITICAL priority)
    await this.deps.publishKillSwitch(governanceEvent)

    // Log activation to Liquid_Ledger
    const ledgerEvent: LedgerWriteEvent = {
      event_id: randomUUID(),
      tenant_id: tenantId,
      entry_type: 'KILL_SWITCH_ACTIVATED',
      payload: {
        event_type: 'KILL_SWITCH_ACTIVATED',
        user_identity: userId,
        timestamp: now,
        reason: reason ?? 'manual',
      },
      agent_id: 'governor-agent',
      timestamp: now,
    }
    await this.deps.writeLedger(ledgerEvent)

    // Poll agents for halt confirmation within 5 seconds
    if (agentIds.length > 0) {
      await this.confirmHalt(tenantId, agentIds)
    }
  }

  /**
   * Reset the circuit breaker to HALF_OPEN.
   * Requires health verification before transitioning to CLOSED.
   */
  async reset(tenantId: string, adminUserId: string): Promise<void> {
    const current = this.getState(tenantId)
    if (current !== 'OPEN') {
      throw new Error(`Cannot reset kill-switch in state ${current} for tenant ${tenantId}`)
    }
    this.states.set(tenantId, 'HALF_OPEN')
  }

  /**
   * Complete health verification and close the circuit.
   * Should only be called after all agents pass health checks.
   */
  close(tenantId: string): void {
    const current = this.getState(tenantId)
    if (current !== 'HALF_OPEN') {
      throw new Error(`Cannot close circuit in state ${current} for tenant ${tenantId}`)
    }
    this.states.set(tenantId, 'CLOSED')
  }

  /**
   * Check whether execution is allowed for a tenant.
   * Returns false when state is OPEN.
   */
  isExecutionAllowed(tenantId: string): boolean {
    return this.getState(tenantId) !== 'OPEN'
  }

  private async confirmHalt(tenantId: string, agentIds: string[]): Promise<void> {
    const deadline = Date.now() + HALT_CONFIRM_TIMEOUT_MS
    const unconfirmed = new Set(agentIds)

    while (unconfirmed.size > 0 && Date.now() < deadline) {
      const checks = Array.from(unconfirmed).map(async (agentId) => {
        const halted = await this.deps.pollAgentHalt(tenantId, agentId)
        if (halted) unconfirmed.delete(agentId)
      })
      await Promise.all(checks)
      if (unconfirmed.size > 0) {
        await new Promise((r) => setTimeout(r, 200))
      }
    }

    if (unconfirmed.size > 0) {
      // Escalate: agents did not confirm halt within 5 seconds
      const msg = `Kill-switch escalation: agents did not confirm halt within 5s: ${Array.from(unconfirmed).join(', ')}`
      await this.deps.notifyAdmins(tenantId, msg)
    }
  }
}
