/**
 * BehaviorAnomalyMonitor — detects rogue agent behavior via 7-day rolling baseline.
 *
 * Requirements: 5.3, 5.4
 */

export interface ActionRateSample {
  /** ISO-8601 timestamp of the sample */
  timestamp: string
  /** Actions per hour at this sample */
  actions_per_hour: number
}

export interface BehaviorBaseline {
  agent_id: string
  mean: number
  std_dev: number
  sample_count: number
  window_start: string
  window_end: string
}

export interface AnomalyFlagResult {
  flagged: boolean
  agent_id: string
  current_rate: number
  baseline: BehaviorBaseline
  deviation_sigmas: number
  reason?: string
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ANOMALY_SIGMA_THRESHOLD = 3

/**
 * BehaviorAnomalyMonitor computes a 7-day rolling baseline (mean + std dev)
 * per agent and flags agents whose current action rate exceeds the baseline
 * by more than 3 standard deviations.
 */
export class BehaviorAnomalyMonitor {
  /** Map: agentId → rolling samples */
  private readonly samples = new Map<string, ActionRateSample[]>()

  private readonly onAnomaly: (agentId: string) => Promise<void>

  constructor(onAnomaly: (agentId: string) => Promise<void>) {
    this.onAnomaly = onAnomaly
  }

  /**
   * Record a new action rate sample and check for behavioral anomaly.
   * Triggers isolateAgent() if current rate exceeds baseline by >3 std devs.
   */
  async monitor(agentId: string, actionRate: number): Promise<AnomalyFlagResult> {
    const now = new Date()
    this.ensureSamples(agentId)
    this.pruneOldSamples(agentId, now)

    const agentSamples = this.samples.get(agentId)!
    const baseline = this.computeBaseline(agentId, agentSamples, now)

    const deviationSigmas =
      baseline.std_dev > 0
        ? (actionRate - baseline.mean) / baseline.std_dev
        : 0

    const flagged = deviationSigmas > ANOMALY_SIGMA_THRESHOLD

    // Add sample AFTER computing baseline to avoid self-influence
    agentSamples.push({ timestamp: now.toISOString(), actions_per_hour: actionRate })

    if (flagged) {
      await this.onAnomaly(agentId)
    }

    return {
      flagged,
      agent_id: agentId,
      current_rate: actionRate,
      baseline,
      deviation_sigmas: deviationSigmas,
      reason: flagged
        ? `Action rate ${actionRate} exceeds baseline mean ${baseline.mean.toFixed(2)} by ${deviationSigmas.toFixed(2)} standard deviations`
        : undefined,
    }
  }

  /** Seed historical samples for an agent (used during warm-up) */
  seedSamples(agentId: string, history: ActionRateSample[]): void {
    this.ensureSamples(agentId)
    this.samples.get(agentId)!.push(...history)
  }

  getBaseline(agentId: string): BehaviorBaseline {
    this.ensureSamples(agentId)
    const agentSamples = this.samples.get(agentId)!
    return this.computeBaseline(agentId, agentSamples, new Date())
  }

  private ensureSamples(agentId: string): void {
    if (!this.samples.has(agentId)) {
      this.samples.set(agentId, [])
    }
  }

  private pruneOldSamples(agentId: string, now: Date): void {
    const cutoff = now.getTime() - SEVEN_DAYS_MS
    const agentSamples = this.samples.get(agentId)!
    let i = 0
    while (i < agentSamples.length && new Date(agentSamples[i].timestamp).getTime() < cutoff) {
      i++
    }
    if (i > 0) agentSamples.splice(0, i)
  }

  private computeBaseline(
    agentId: string,
    agentSamples: ActionRateSample[],
    now: Date,
  ): BehaviorBaseline {
    if (agentSamples.length === 0) {
      return {
        agent_id: agentId,
        mean: 0,
        std_dev: 0,
        sample_count: 0,
        window_start: new Date(now.getTime() - SEVEN_DAYS_MS).toISOString(),
        window_end: now.toISOString(),
      }
    }

    const rates = agentSamples.map((s) => s.actions_per_hour)
    const mean = rates.reduce((a, b) => a + b, 0) / rates.length
    const variance = rates.reduce((sum, v) => sum + (v - mean) ** 2, 0) / rates.length

    return {
      agent_id: agentId,
      mean,
      std_dev: Math.sqrt(variance),
      sample_count: agentSamples.length,
      window_start: agentSamples[0].timestamp,
      window_end: now.toISOString(),
    }
  }
}
