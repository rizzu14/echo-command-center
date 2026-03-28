import { randomUUID } from 'crypto'
import type { CarbonIntensityReading, DataStalenessWarning } from '../shared/types'

// ---------------------------------------------------------------------------
// Electricity Maps API types (mocked)
// ---------------------------------------------------------------------------

interface ElectricityMapsResponse {
  zone: string
  carbonIntensity: number // gCO2eq/kWh
  datetime: string
  updatedAt: string
  forecast?: Array<{ datetime: string; carbonIntensity: number }>
}

async function callElectricityMapsApi(region: string): Promise<ElectricityMapsResponse> {
  // Mock realistic Electricity Maps API response
  const baseIntensity: Record<string, number> = {
    'us-east-1': 380,
    'us-west-2': 120,
    'eu-west-1': 210,
    'eu-central-1': 280,
    'ap-southeast-1': 450,
    'ap-northeast-1': 500,
  }

  const intensity = baseIntensity[region] ?? 350
  const now = new Date()

  return {
    zone: region,
    carbonIntensity: intensity + Math.floor(Math.random() * 40 - 20), // ±20 variance
    datetime: now.toISOString(),
    updatedAt: now.toISOString(),
    forecast: Array.from({ length: 24 }, (_, i) => ({
      datetime: new Date(now.getTime() + i * 3_600_000).toISOString(),
      carbonIntensity: intensity + Math.floor(Math.random() * 60 - 30),
    })),
  }
}

// ---------------------------------------------------------------------------
// LastKnownIntensityCache
// ---------------------------------------------------------------------------

export class LastKnownIntensityCache {
  private readonly cache = new Map<string, CarbonIntensityReading>()

  set(reading: CarbonIntensityReading): void {
    this.cache.set(reading.region, reading)
  }

  get(region: string): CarbonIntensityReading | null {
    return this.cache.get(region) ?? null
  }

  /** Returns true if the cached reading is older than staleThresholdMs */
  isStale(region: string, staleThresholdMs: number): boolean {
    const reading = this.cache.get(region)
    if (!reading) return true
    const age = Date.now() - new Date(reading.timestamp).getTime()
    return age > staleThresholdMs
  }

  clear(region: string): void {
    this.cache.delete(region)
  }
}

// ---------------------------------------------------------------------------
// CarbonIntensityFeed
// ---------------------------------------------------------------------------

export interface CarbonFeedConfig {
  regions: string[]
  /** Poll interval in milliseconds — max 15 minutes (900 000 ms) per spec */
  pollIntervalMs?: number
  /** Staleness threshold in milliseconds — default 30 minutes */
  staleThresholdMs?: number
  onStalenessWarning?: (warning: DataStalenessWarning) => void
}

export class CarbonIntensityFeed {
  private readonly regions: string[]
  private readonly pollIntervalMs: number
  private readonly staleThresholdMs: number
  private readonly onStalenessWarning?: (warning: DataStalenessWarning) => void
  private readonly cache: LastKnownIntensityCache

  private latestReadings = new Map<string, CarbonIntensityReading>()
  private feedUnavailableSince = new Map<string, string>()

  constructor(config: CarbonFeedConfig) {
    this.regions = config.regions
    this.pollIntervalMs = Math.min(config.pollIntervalMs ?? 900_000, 900_000)
    this.staleThresholdMs = config.staleThresholdMs ?? 30 * 60_000
    this.onStalenessWarning = config.onStalenessWarning
    this.cache = new LastKnownIntensityCache()
  }

  /** Poll all configured regions and update readings */
  async poll(): Promise<CarbonIntensityReading[]> {
    const results: CarbonIntensityReading[] = []

    for (const region of this.regions) {
      try {
        const response = await callElectricityMapsApi(region)
        const reading: CarbonIntensityReading = {
          region,
          intensity_gco2_per_kwh: response.carbonIntensity,
          forecast_horizon_hours: response.forecast?.length ?? 0,
          timestamp: response.datetime,
        }
        this.latestReadings.set(region, reading)
        this.cache.set(reading)
        this.feedUnavailableSince.delete(region)
        results.push(reading)
      } catch (err) {
        this.handleFeedFailure(region, err instanceof Error ? err.message : String(err))
      }
    }

    return results
  }

  /** Get the latest reading for a region, falling back to cache if feed is unavailable */
  getReading(region: string): CarbonIntensityReading | null {
    const live = this.latestReadings.get(region)
    if (live) return live

    const cached = this.cache.get(region)
    if (cached) {
      this.emitStalenessWarning(region, cached)
      return cached
    }

    return null
  }

  /**
   * Get a forecast for a region N hours ahead.
   * Returns the latest known intensity if no forecast data is available.
   */
  getForecast(region: string, hoursAhead: number): CarbonIntensityReading | null {
    const reading = this.getReading(region)
    if (!reading) return null

    // If we have forecast data, return a projected reading
    const forecastTimestamp = new Date(
      new Date(reading.timestamp).getTime() + hoursAhead * 3_600_000,
    ).toISOString()

    return {
      region,
      intensity_gco2_per_kwh: reading.intensity_gco2_per_kwh, // use latest as proxy
      forecast_horizon_hours: hoursAhead,
      timestamp: forecastTimestamp,
    }
  }

  /** Check if the data for a region is stale */
  isStale(region: string): boolean {
    return this.cache.isStale(region, this.staleThresholdMs)
  }

  get pollInterval(): number {
    return this.pollIntervalMs
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private handleFeedFailure(region: string, errorMessage: string): void {
    console.warn(`[CarbonIntensityFeed] Poll failed for region "${region}": ${errorMessage}`)

    if (!this.feedUnavailableSince.has(region)) {
      this.feedUnavailableSince.set(region, new Date().toISOString())
    }

    const unavailableSince = this.feedUnavailableSince.get(region)!
    const unavailableMs = Date.now() - new Date(unavailableSince).getTime()

    if (unavailableMs >= this.staleThresholdMs) {
      const cached = this.cache.get(region)
      if (cached) {
        this.emitStalenessWarning(region, cached)
      }
    }
  }

  private emitStalenessWarning(region: string, cached: CarbonIntensityReading): void {
    const staleSince = this.feedUnavailableSince.get(region) ?? cached.timestamp
    const durationMinutes = Math.floor(
      (Date.now() - new Date(staleSince).getTime()) / 60_000,
    )

    const warning: DataStalenessWarning = {
      event_id: randomUUID(),
      region,
      stale_since: staleSince,
      duration_minutes: durationMinutes,
      last_known_intensity: cached.intensity_gco2_per_kwh,
      timestamp: new Date().toISOString(),
    }

    this.onStalenessWarning?.(warning)
  }
}
