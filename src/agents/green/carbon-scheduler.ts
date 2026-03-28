/**
 * CarbonAwareScheduler — Green Architect Agent
 * Tasks 67–70
 */

export interface CarbonIntensityWindow {
  region: string
  start_time: string
  end_time: string
  intensity_gco2_per_kwh: number
}

export interface Workload {
  workload_id: string
  tenant_id: string
  energy_kwh: number
  time_shiftable: boolean
  deadline: string
  region: string
  current_window: CarbonIntensityWindow
}

export type ScheduleDecision =
  | { decision: 'EXECUTE_NOW'; reason: string }
  | { decision: 'SCHEDULE'; window: CarbonIntensityWindow; carbon_savings_kgco2e: number; reason: string }

export class CarbonAwareScheduler {
  schedule(workload: Workload, availableWindows: CarbonIntensityWindow[]): ScheduleDecision {
    if (!workload.time_shiftable) {
      return { decision: 'EXECUTE_NOW', reason: 'Workload is not time-shiftable' }
    }

    const now = new Date()
    const deadline = new Date(workload.deadline)
    const currentIntensity = workload.current_window.intensity_gco2_per_kwh

    // Find windows with ≥20% lower intensity
    const candidates = availableWindows.filter(w => {
      const windowStart = new Date(w.start_time)
      return (
        windowStart <= deadline &&
        w.intensity_gco2_per_kwh <= currentIntensity * 0.80
      )
    })

    if (candidates.length === 0) {
      // No candidates — if past deadline, execute now
      if (now >= deadline) {
        return { decision: 'EXECUTE_NOW', reason: 'No lower-intensity windows found and deadline reached' }
      }
      return { decision: 'EXECUTE_NOW', reason: 'No windows with ≥20% lower carbon intensity found' }
    }

    // Select best window = min intensity
    const best_window = candidates.reduce((best, w) =>
      w.intensity_gco2_per_kwh < best.intensity_gco2_per_kwh ? w : best,
    )

    const savings = CO2eSavingsCalculator.calculate(
      workload,
      workload.current_window,
      best_window,
    )

    return {
      decision: 'SCHEDULE',
      window: best_window,
      carbon_savings_kgco2e: savings.carbon_savings_kgco2e,
      reason: `Scheduled to window with ${best_window.intensity_gco2_per_kwh} gCO2/kWh vs current ${currentIntensity} gCO2/kWh`,
    }
  }
}

export interface CO2eSavingsResult {
  carbon_savings_kgco2e: number
  original_intensity: number
  scheduled_intensity: number
  energy_kwh: number
}

export class CO2eSavingsCalculator {
  static calculate(
    workload: Workload,
    originalWindow: CarbonIntensityWindow,
    scheduledWindow: CarbonIntensityWindow,
  ): CO2eSavingsResult {
    const original_intensity = originalWindow.intensity_gco2_per_kwh
    const scheduled_intensity = scheduledWindow.intensity_gco2_per_kwh

    // carbon_savings_kgco2e = energy_kwh * (original - scheduled) / 1000
    const raw_savings = workload.energy_kwh * (original_intensity - scheduled_intensity) / 1000

    // Result must be ≥ 0
    const carbon_savings_kgco2e = Math.max(0, raw_savings)

    return {
      carbon_savings_kgco2e,
      original_intensity,
      scheduled_intensity,
      energy_kwh: workload.energy_kwh,
    }
  }
}
