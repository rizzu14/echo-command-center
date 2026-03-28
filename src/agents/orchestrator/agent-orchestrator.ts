/**
 * AgentOrchestrator — routes events to specialized agents, monitors health,
 * coordinates A2A requests, and enforces tenant isolation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import type { CostLeakageEvent } from '../../infrastructure/kafka/schemas/cost-leakage-event.js'
import type { GovernanceEvent } from '../../infrastructure/kafka/schemas/governance-event.js'
import type { CarbonEvent } from '../../infrastructure/kafka/schemas/carbon-event.js'
import type { FinancialModelingEvent } from '../../infrastructure/kafka/schemas/financial-modeling-event.js'

export type AgentType = 'AUDITOR' | 'GOVERNOR' | 'GREEN_ARCHITECT' | 'FINANCE' | 'STANDBY'

export type EchoEvent =
  | ({ _type: 'CostLeakageEvent' } & CostLeakageEvent)
  | ({ _type: 'GovernanceEvent' } & GovernanceEvent)
  | ({ _type: 'CarbonEvent' } & CarbonEvent)
  | ({ _type: 'FinancialModelingEvent' } & FinancialModelingEvent)

export interface AgentHandle {
  agentId: string
  agentType: AgentType
  tenantId: string
  /** Returns true if the agent responds within the given timeout */
  ping(timeoutMs: number): Promise<boolean>
  /** Dispatch an event to this agent */
  dispatch(event: EchoEvent): Promise<void>
}

export interface A2ARequest {
  requestId: string
  fromAgent: string
  toAgent: string
  tenantId: string
  taskType: string
  payload: Record<string, unknown>
}

export interface A2AResponse {
  requestId: string
  success: boolean
  payload: Record<string, unknown>
  latencyMs: number
}

export interface RoutingResult {
  agentId: string
  agentType: AgentType
  usedFallback: boolean
}

/** In-memory health state for an agent */
interface AgentHealthEntry {
  agentId: string
  agentType: AgentType
  tenantId: string
  available: boolean
  lastChecked: number
}

/**
 * AgentOrchestrator routes events to the correct specialized agent,
 * monitors health every ≤30 seconds, coordinates A2A requests within 2 seconds,
 * and enforces tenant isolation.
 */
export class AgentOrchestrator {
  /** Map from agentId → AgentHandle */
  readonly routingTable = new Map<string, AgentHandle>()

  /** Map from agentId → health entry */
  readonly healthRegistry = new Map<string, AgentHealthEntry>()

  /** A2A coordinator timeout in ms */
  private readonly a2aTimeoutMs: number

  /** Health poll interval in ms (≤30 000) */
  private readonly healthPollIntervalMs: number

  private healthPollTimer: ReturnType<typeof setInterval> | null = null

  constructor(options?: { a2aTimeoutMs?: number; healthPollIntervalMs?: number }) {
    this.a2aTimeoutMs = options?.a2aTimeoutMs ?? 2000
    this.healthPollIntervalMs = Math.min(options?.healthPollIntervalMs ?? 30_000, 30_000)
  }

  /** Register an agent handle with the orchestrator */
  registerAgent(handle: AgentHandle): void {
    this.routingTable.set(handle.agentId, handle)
    this.healthRegistry.set(handle.agentId, {
      agentId: handle.agentId,
      agentType: handle.agentType,
      tenantId: handle.tenantId,
      available: true,
      lastChecked: Date.now(),
    })
  }

  /**
   * Route an event to the correct agent by event type.
   * Falls back to a standby agent if the primary is unavailable.
   */
  async route(event: EchoEvent): Promise<RoutingResult> {
    const targetType = this.resolveTargetType(event)
    const tenantId = event.tenant_id

    // Find primary agent for this tenant + type
    const primary = this.findAgent(tenantId, targetType)
    if (primary && this.isAvailable(primary.agentId)) {
      await primary.dispatch(event)
      return { agentId: primary.agentId, agentType: targetType, usedFallback: false }
    }

    // Fall back to standby
    const standby = this.findAgent(tenantId, 'STANDBY')
    if (standby && this.isAvailable(standby.agentId)) {
      await standby.dispatch(event)
      return { agentId: standby.agentId, agentType: 'STANDBY', usedFallback: true }
    }

    throw new Error(
      `No available agent for event type ${event._type} in tenant ${tenantId}`,
    )
  }

  /** Determine which agent type should handle this event */
  private resolveTargetType(event: EchoEvent): AgentType {
    switch (event._type) {
      case 'CostLeakageEvent':
        return 'AUDITOR'
      case 'GovernanceEvent':
        return 'GOVERNOR'
      case 'CarbonEvent':
        return 'GREEN_ARCHITECT'
      case 'FinancialModelingEvent':
        return 'FINANCE'
    }
  }

  private findAgent(tenantId: string, agentType: AgentType): AgentHandle | undefined {
    for (const handle of this.routingTable.values()) {
      if (handle.tenantId === tenantId && handle.agentType === agentType) {
        return handle
      }
    }
    return undefined
  }

  private isAvailable(agentId: string): boolean {
    return this.healthRegistry.get(agentId)?.available ?? false
  }

  /**
   * Poll all registered agents; mark unavailable if no response within 30 seconds.
   * Called automatically on the health poll interval.
   */
  async healthCheck(): Promise<void> {
    const checks = Array.from(this.routingTable.values()).map(async (handle) => {
      const responded = await handle.ping(30_000)
      const entry = this.healthRegistry.get(handle.agentId)
      if (entry) {
        entry.available = responded
        entry.lastChecked = Date.now()
      }
    })
    await Promise.all(checks)
  }

  /** Start the periodic health poll (≤30 s interval) */
  startHealthPolling(): void {
    if (this.healthPollTimer) return
    this.healthPollTimer = setInterval(() => {
      this.healthCheck().catch((err) =>
        console.error('[AgentOrchestrator] healthCheck error:', err),
      )
    }, this.healthPollIntervalMs)
  }

  stopHealthPolling(): void {
    if (this.healthPollTimer) {
      clearInterval(this.healthPollTimer)
      this.healthPollTimer = null
    }
  }

  /**
   * Coordinate an inter-agent A2A request within 2 seconds.
   * Throws if the target agent does not respond within the timeout.
   */
  async coordinateA2A(request: A2ARequest): Promise<A2AResponse> {
    const start = Date.now()
    const target = this.routingTable.get(request.toAgent)
    if (!target) {
      throw new Error(`A2A target agent not found: ${request.toAgent}`)
    }

    // Enforce tenant isolation: both agents must belong to the same tenant
    const fromHandle = this.routingTable.get(request.fromAgent)
    if (fromHandle && fromHandle.tenantId !== target.tenantId) {
      throw new Error(
        `A2A cross-tenant request denied: ${request.fromAgent} (${fromHandle.tenantId}) → ${request.toAgent} (${target.tenantId})`,
      )
    }

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('A2A request timed out')), this.a2aTimeoutMs),
    )

    const dispatchPromise = target
      .dispatch({
        _type: 'GovernanceEvent',
        event_id: request.requestId,
        tenant_id: request.tenantId,
        event_type: 'AGENT_ISOLATED', // placeholder — real impl would use task_type
        payload: request.payload,
        timestamp: new Date().toISOString(),
      })
      .then(() => ({
        requestId: request.requestId,
        success: true,
        payload: {},
        latencyMs: Date.now() - start,
      }))

    return Promise.race([dispatchPromise, timeoutPromise])
  }

  /**
   * Verify that the given agent operates within its registered tenant boundary.
   * Throws if the agent is registered under a different tenant.
   */
  enforceIsolation(tenantId: string, agentId: string): void {
    const handle = this.routingTable.get(agentId)
    if (!handle) {
      throw new Error(`Agent not registered: ${agentId}`)
    }
    if (handle.tenantId !== tenantId) {
      throw new Error(
        `Isolation violation: agent ${agentId} belongs to tenant ${handle.tenantId}, not ${tenantId}`,
      )
    }
  }
}
