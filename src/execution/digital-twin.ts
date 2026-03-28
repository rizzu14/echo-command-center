/**
 * DigitalTwin — Execution Engine simulation
 * Task 36
 */

export interface InfrastructureSnapshot {
  tenant_id: string
  resources: Record<string, ResourceState>
  captured_at: string
}

export interface ResourceState {
  resource_id: string
  resource_type: string
  current_cost_usd_per_hour: number
  utilization_pct: number
  region: string
  tags: Record<string, string>
  metadata: Record<string, unknown>
}

export interface ProposedAction {
  action_id: string
  action_type: string
  resource_id: string
  parameters: Record<string, unknown>
  projected_savings_usd?: number
  projected_roi?: number
}

export interface SimulationResult {
  action_id: string
  predicted_outcome: string
  cost_delta_usd: number
  risk_indicators: RiskIndicators
  simulated_at: string
  snapshot_after: InfrastructureSnapshot
}

export interface RiskIndicators {
  blast_radius: number
  reversibility: number
  confidence: number
  financial_impact: number
}

export interface ExecutionOutcome {
  action_id: string
  actual_savings_usd: number
  simulation_deviation_pct: number
  executed_at: string
  success: boolean
}

export class DigitalTwin {
  private state: InfrastructureSnapshot | null = null

  setState(snapshot: InfrastructureSnapshot): void {
    this.state = JSON.parse(JSON.stringify(snapshot)) as InfrastructureSnapshot
  }

  getState(): InfrastructureSnapshot | null {
    return this.state ? (JSON.parse(JSON.stringify(this.state)) as InfrastructureSnapshot) : null
  }

  simulate(action: ProposedAction): SimulationResult {
    if (!this.state) {
      throw new Error('No infrastructure snapshot loaded. Call setState() first.')
    }

    // Deep copy — must NOT modify actual state
    const snapshotCopy: InfrastructureSnapshot = JSON.parse(JSON.stringify(this.state))

    const resource = snapshotCopy.resources[action.resource_id]
    let cost_delta_usd = 0
    let predicted_outcome = 'NO_CHANGE'

    if (resource) {
      switch (action.action_type) {
        case 'SCALE_DOWN': {
          const factor = (action.parameters.scale_factor as number) ?? 0.5
          const newCost = resource.current_cost_usd_per_hour * factor
          cost_delta_usd = -(resource.current_cost_usd_per_hour - newCost) * 720
          resource.current_cost_usd_per_hour = newCost
          predicted_outcome = 'SCALED_DOWN'
          break
        }
        case 'TERMINATE': {
          cost_delta_usd = -resource.current_cost_usd_per_hour * 720
          delete snapshotCopy.resources[action.resource_id]
          predicted_outcome = 'TERMINATED'
          break
        }
        case 'CONSOLIDATE': {
          const targetId = action.parameters.target_resource_id as string
          const target = snapshotCopy.resources[targetId]
          if (target) {
            cost_delta_usd = -resource.current_cost_usd_per_hour * 720
            delete snapshotCopy.resources[action.resource_id]
            predicted_outcome = 'CONSOLIDATED'
          }
          break
        }
        default:
          predicted_outcome = 'UNKNOWN_ACTION'
      }
    }

    const risk_indicators: RiskIndicators = {
      blast_radius: resource ? 1 : 0,
      reversibility: action.action_type === 'TERMINATE' ? 0.1 : 0.8,
      confidence: 0.75,
      financial_impact: Math.abs(cost_delta_usd),
    }

    return {
      action_id: action.action_id,
      predicted_outcome,
      cost_delta_usd,
      risk_indicators,
      simulated_at: new Date().toISOString(),
      snapshot_after: snapshotCopy,
    }
  }

  updateState(outcome: ExecutionOutcome): void {
    if (!this.state) return
    // Update twin with real execution results
    this.state.captured_at = outcome.executed_at
    // Additional state updates would be applied here based on outcome
  }
}
