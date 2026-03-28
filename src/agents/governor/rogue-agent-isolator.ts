/**
 * RogueAgentIsolator — suspends rogue agents and revokes Execution_Engine access.
 *
 * Requirements: 5.3, 5.4
 */

import { randomUUID } from 'crypto'
import type { LedgerWriteEvent } from '../../infrastructure/kafka/schemas/ledger-write-event.js'

export interface ContainmentEvent {
  event_id: string
  tenant_id: string
  agent_id: string
  isolated_at: string
  reason: string
}

export interface IsolationResult {
  success: boolean
  agent_id: string
  isolated_at: string
  ledger_written: boolean
  admins_notified: boolean
}

export interface RogueAgentIsolatorDeps {
  /** Suspend agent execution (must complete within 10 seconds) */
  suspendAgent(agentId: string): Promise<void>
  /** Revoke Execution_Engine access for the agent (must complete within 10 seconds) */
  revokeExecutionAccess(agentId: string): Promise<void>
  /** Write ContainmentEvent to Liquid_Ledger */
  writeLedger(event: LedgerWriteEvent): Promise<void>
  /** Notify tenant administrators */
  notifyAdmins(tenantId: string, message: string): Promise<void>
}

const ISOLATION_TIMEOUT_MS = 10_000

/**
 * RogueAgentIsolator suspends a rogue agent and revokes its Execution_Engine
 * access within 10 seconds, then emits a ContainmentEvent to the Liquid_Ledger
 * and notifies tenant administrators.
 *
 * Both ledger write and notification must complete before isolation is considered complete.
 */
export class RogueAgentIsolator {
  private readonly deps: RogueAgentIsolatorDeps

  constructor(deps: RogueAgentIsolatorDeps) {
    this.deps = deps
  }

  /**
   * Isolate a rogue agent:
   *  1. Suspend agent execution
   *  2. Revoke Execution_Engine access
   *  3. Emit ContainmentEvent to Liquid_Ledger
   *  4. Notify tenant administrators
   *
   * Steps 1 & 2 must complete within 10 seconds.
   * Steps 3 & 4 must both complete before isolation is considered complete.
   */
  async isolate(agentId: string, tenantId: string, reason: string): Promise<IsolationResult> {
    const isolatedAt = new Date().toISOString()

    // Steps 1 & 2: suspend and revoke within 10 seconds
    const isolationTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Isolation timed out for agent ${agentId}`)), ISOLATION_TIMEOUT_MS),
    )

    await Promise.race([
      Promise.all([
        this.deps.suspendAgent(agentId),
        this.deps.revokeExecutionAccess(agentId),
      ]),
      isolationTimeout,
    ])

    // Step 3: emit ContainmentEvent to Liquid_Ledger
    const containmentEvent: ContainmentEvent = {
      event_id: randomUUID(),
      tenant_id: tenantId,
      agent_id: agentId,
      isolated_at: isolatedAt,
      reason,
    }

    const ledgerEvent: LedgerWriteEvent = {
      event_id: randomUUID(),
      tenant_id: tenantId,
      entry_type: 'AGENT_ISOLATED',
      payload: containmentEvent as unknown as Record<string, unknown>,
      agent_id: 'governor-agent',
      timestamp: isolatedAt,
    }

    let ledgerWritten = false
    let adminsNotified = false

    // Steps 3 & 4 must both complete before isolation is considered complete
    await Promise.all([
      this.deps.writeLedger(ledgerEvent).then(() => { ledgerWritten = true }),
      this.deps
        .notifyAdmins(
          tenantId,
          `Agent ${agentId} has been isolated. Reason: ${reason}. Isolated at: ${isolatedAt}`,
        )
        .then(() => { adminsNotified = true }),
    ])

    return {
      success: true,
      agent_id: agentId,
      isolated_at: isolatedAt,
      ledger_written: ledgerWritten,
      admins_notified: adminsNotified,
    }
  }
}
