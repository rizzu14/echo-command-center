/**
 * RollbackManager — Execution Engine
 * Task 40
 */

export interface ResourceSnapshot {
  resource_id: string
  state: Record<string, unknown>
  captured_at: string
}

export interface RollbackSnapshot {
  action_id: string
  tenant_id: string
  resources: ResourceSnapshot[]
  captured_at: string
}

export interface RollbackEvent {
  event_type: 'ROLLBACK_INITIATED'
  action_id: string
  tenant_id: string
  initiated_at: string
  reason: string
}

export interface RollbackResult {
  action_id: string
  success: boolean
  duration_seconds: number
  completed_at: string
}

export interface RollbackManagerDeps {
  writeLedger?: (entry: unknown) => Promise<void>
  escalateToGovernor?: (actionId: string, reason: string) => Promise<void>
  restoreResource?: (resource: ResourceSnapshot) => Promise<void>
}

export class RollbackManager {
  private snapshots = new Map<string, RollbackSnapshot>()
  private deps: RollbackManagerDeps

  constructor(deps: RollbackManagerDeps = {}) {
    this.deps = deps
  }

  captureSnapshot(actionId: string, tenantId: string, resources: ResourceSnapshot[]): RollbackSnapshot {
    const snapshot: RollbackSnapshot = {
      action_id: actionId,
      tenant_id: tenantId,
      resources: JSON.parse(JSON.stringify(resources)) as ResourceSnapshot[],
      captured_at: new Date().toISOString(),
    }
    this.snapshots.set(actionId, snapshot)
    return snapshot
  }

  async rollback(actionId: string, reason = 'simulation_deviation_exceeded'): Promise<RollbackResult> {
    const snapshot = this.snapshots.get(actionId)
    if (!snapshot) throw new Error(`No snapshot found for action: ${actionId}`)

    const startTime = Date.now()
    const ROLLBACK_TIMEOUT_MS = 300_000 // 300 seconds

    // Emit rollback event to ledger
    const rollbackEvent: RollbackEvent = {
      event_type: 'ROLLBACK_INITIATED',
      action_id: actionId,
      tenant_id: snapshot.tenant_id,
      initiated_at: new Date().toISOString(),
      reason,
    }

    if (this.deps.writeLedger) {
      await this.deps.writeLedger({
        entry_id: `rollback-${actionId}-${Date.now()}`,
        tenant_id: snapshot.tenant_id,
        agent_id: 'EXECUTION_ENGINE',
        action_type: 'ROLLBACK_INITIATED',
        payload: rollbackEvent,
        timestamp: rollbackEvent.initiated_at,
      })
    }

    try {
      // Restore each resource
      for (const resource of snapshot.resources) {
        if (Date.now() - startTime > ROLLBACK_TIMEOUT_MS) {
          throw new Error(`Rollback timeout exceeded 300s for action ${actionId}`)
        }
        if (this.deps.restoreResource) {
          await this.deps.restoreResource(resource)
        }
      }

      const duration_seconds = (Date.now() - startTime) / 1000
      return {
        action_id: actionId,
        success: true,
        duration_seconds,
        completed_at: new Date().toISOString(),
      }
    } catch (err) {
      const duration_seconds = (Date.now() - startTime) / 1000
      // Escalate to Governor_Agent if rollback fails
      if (this.deps.escalateToGovernor) {
        await this.deps.escalateToGovernor(
          actionId,
          `Rollback failed after ${duration_seconds.toFixed(1)}s: ${(err as Error).message}`,
        )
      }
      return {
        action_id: actionId,
        success: false,
        duration_seconds,
        completed_at: new Date().toISOString(),
      }
    }
  }

  getSnapshot(actionId: string): RollbackSnapshot | undefined {
    return this.snapshots.get(actionId)
  }
}
