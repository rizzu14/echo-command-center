/**
 * ContractDigitalTwin — SLA Prevention Agent
 * Tasks 27–29, 32
 */

export type SLAState = 'HEALTHY' | 'WARNING' | 'BREACHED' | 'REMEDIATED'

export interface SLATerm {
  metric_name: string
  threshold: number
  unit: string
}

export interface PenaltySchedule {
  minor_pct: number
  major_pct: number
  monthly_fee_usd: number
}

export interface SLAContract {
  contract_id: string
  tenant_id: string
  vendor_name: string
  service_name: string
  terms: SLATerm[]
  penalty_schedule: PenaltySchedule
}

export interface ContractModel {
  contract: SLAContract
  state: SLAState
  last_evaluated: string
}

export interface PreBreachWarningEvent {
  event_type: 'PRE_BREACH_WARNING'
  contract_id: string
  tenant_id: string
  metric_name: string
  current_value: number
  threshold_value: number
  proximity_pct: number
  projected_breach_time: string
  estimated_penalty_usd: number
}

export interface LedgerEntry {
  entry_id: string
  tenant_id: string
  agent_id: string
  action_type: string
  payload: Record<string, unknown>
  timestamp: string
}

export interface ContractDigitalTwinDeps {
  emitWarning?: (event: PreBreachWarningEvent) => Promise<void>
  writeLedger?: (entry: LedgerEntry) => Promise<void>
  fetchMetric?: (contractId: string, metricName: string) => Promise<number>
}

export class ContractDigitalTwin {
  private models = new Map<string, ContractModel>()
  private deps: ContractDigitalTwinDeps

  constructor(deps: ContractDigitalTwinDeps = {}) {
    this.deps = deps
  }

  ingestContract(contractJson: unknown): ContractModel {
    const parsed = this._validate(contractJson)
    const existing = this.models.get(parsed.contract_id)
    const model: ContractModel = {
      contract: parsed,
      state: existing?.state ?? 'HEALTHY',
      last_evaluated: new Date().toISOString(),
    }
    this.models.set(parsed.contract_id, model)
    return model
  }

  private _validate(raw: unknown): SLAContract {
    if (!raw || typeof raw !== 'object') throw new Error('Contract must be a non-null object')
    const c = raw as Record<string, unknown>
    if (typeof c.contract_id !== 'string' || !c.contract_id)
      throw new Error('Missing required field: contract_id (string)')
    if (typeof c.tenant_id !== 'string' || !c.tenant_id)
      throw new Error('Missing required field: tenant_id (string)')
    if (typeof c.vendor_name !== 'string' || !c.vendor_name)
      throw new Error('Missing required field: vendor_name (string)')
    if (typeof c.service_name !== 'string' || !c.service_name)
      throw new Error('Missing required field: service_name (string)')
    if (!Array.isArray(c.terms) || c.terms.length === 0)
      throw new Error('Missing required field: terms (non-empty array)')
    for (const t of c.terms as unknown[]) {
      const term = t as Record<string, unknown>
      if (typeof term.metric_name !== 'string') throw new Error('Each term must have metric_name (string)')
      if (typeof term.threshold !== 'number') throw new Error('Each term must have threshold (number)')
    }
    if (!c.penalty_schedule || typeof c.penalty_schedule !== 'object')
      throw new Error('Missing required field: penalty_schedule (object)')
    const ps = c.penalty_schedule as Record<string, unknown>
    if (typeof ps.monthly_fee_usd !== 'number') throw new Error('penalty_schedule.monthly_fee_usd must be a number')
    if (typeof ps.minor_pct !== 'number') throw new Error('penalty_schedule.minor_pct must be a number')
    if (typeof ps.major_pct !== 'number') throw new Error('penalty_schedule.major_pct must be a number')
    return raw as SLAContract
  }

  getModel(contractId: string): ContractModel | undefined {
    return this.models.get(contractId)
  }

  getAllModels(): ContractModel[] {
    return Array.from(this.models.values())
  }

  async evaluateContract(contractId: string, metricValues: Record<string, number>): Promise<ContractModel> {
    const model = this.models.get(contractId)
    if (!model) throw new Error(`Contract not found: ${contractId}`)

    const { contract } = model
    let newState: SLAState = 'HEALTHY'

    for (const term of contract.terms) {
      const value = metricValues[term.metric_name] ?? 0
      if (value >= term.threshold) {
        newState = 'BREACHED'
        break
      } else if (value >= term.threshold * 0.90) {
        newState = 'WARNING'
      }
    }

    const prevState = model.state
    model.state = newState
    model.last_evaluated = new Date().toISOString()

    if (prevState !== 'WARNING' && newState === 'WARNING') {
      await this._emitPreBreachWarning(model, metricValues)
    }

    if (prevState !== 'BREACHED' && newState === 'BREACHED') {
      await this._recordBreach(model, metricValues)
    }

    return model
  }

  private async _emitPreBreachWarning(model: ContractModel, metricValues: Record<string, number>): Promise<void> {
    if (!this.deps.emitWarning) return
    const { contract } = model
    for (const term of contract.terms) {
      const value = metricValues[term.metric_name] ?? 0
      if (value >= term.threshold * 0.90 && value < term.threshold) {
        const proximity_pct = (value / term.threshold) * 100
        const penalty = this.calculatePenaltyExposure(contract)
        const event: PreBreachWarningEvent = {
          event_type: 'PRE_BREACH_WARNING',
          contract_id: contract.contract_id,
          tenant_id: contract.tenant_id,
          metric_name: term.metric_name,
          current_value: value,
          threshold_value: term.threshold,
          proximity_pct,
          projected_breach_time: new Date(Date.now() + 300000).toISOString(),
          estimated_penalty_usd: penalty,
        }
        await this.deps.emitWarning(event)
      }
    }
  }

  private async _recordBreach(model: ContractModel, metricValues: Record<string, number>): Promise<void> {
    if (!this.deps.writeLedger) return
    const { contract } = model
    const penalty = this.calculatePenaltyExposure(contract)
    const entry: LedgerEntry = {
      entry_id: `breach-${contract.contract_id}-${Date.now()}`,
      tenant_id: contract.tenant_id,
      agent_id: 'SLA_PREVENTION_AGENT',
      action_type: 'SLA_BREACH',
      payload: {
        contract_id: contract.contract_id,
        breach_duration_seconds: 0,
        estimated_penalty_usd: penalty,
        metric_values: metricValues,
      },
      timestamp: new Date().toISOString(),
    }
    await this.deps.writeLedger(entry)
  }

  calculatePenaltyExposure(contract: SLAContract): number {
    const { monthly_fee_usd, major_pct } = contract.penalty_schedule
    return monthly_fee_usd * (major_pct / 100)
  }

  async monitorLoop(intervalMs = 300000): Promise<void> {
    if (!this.deps.fetchMetric) return
    for (const model of this.models.values()) {
      const metricValues: Record<string, number> = {}
      for (const term of model.contract.terms) {
        metricValues[term.metric_name] = await this.deps.fetchMetric(
          model.contract.contract_id,
          term.metric_name,
        )
      }
      await this.evaluateContract(model.contract.contract_id, metricValues)
    }
  }
}
