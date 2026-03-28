/**
 * VendorDataIngestion — ingests procurement/vendor spend data and detects
 * duplicate charges and rate optimization opportunities.
 *
 * Requirements: 1.1, 1.4
 */

import { randomUUID } from 'crypto'
import type { CostLeakageEvent } from '../../infrastructure/kafka/schemas/cost-leakage-event.js'

export interface VendorRecord {
  record_id: string
  tenant_id: string
  vendor_name: string
  service_name: string
  charge_amount_usd: number
  charge_date: string // ISO-8601
  invoice_id: string
  rate_per_unit: number
  unit_count: number
  tags: Record<string, string>
}

export interface DuplicateDetectionConfig {
  /** Time window in milliseconds within which the same charge is considered a duplicate */
  window_ms: number
}

export interface RateOptimizationConfig {
  /** Minimum percentage improvement to flag as an optimization opportunity */
  min_improvement_pct: number
}

export interface IngestionResult {
  processed: number
  duplicates: CostLeakageEvent[]
  rateOptimizations: CostLeakageEvent[]
}

/**
 * VendorDataIngestion ingests vendor spend records, detects duplicate charges
 * within a configurable time window, and identifies rate optimization opportunities.
 */
export class VendorDataIngestion {
  /** Stored records per tenant for duplicate/rate analysis */
  private readonly records = new Map<string, VendorRecord[]>()

  private readonly onLeakage: (event: CostLeakageEvent) => Promise<void>

  constructor(onLeakage: (event: CostLeakageEvent) => Promise<void>) {
    this.onLeakage = onLeakage
  }

  /**
   * Ingest an array of vendor records (from CSV or API import).
   * Detects duplicates and rate optimization opportunities, emitting
   * CostLeakageEvents for each finding.
   */
  async ingest(
    records: VendorRecord[],
    dupConfig: DuplicateDetectionConfig,
    rateConfig: RateOptimizationConfig,
  ): Promise<IngestionResult> {
    const duplicates: CostLeakageEvent[] = []
    const rateOptimizations: CostLeakageEvent[] = []

    for (const record of records) {
      const tenantRecords = this.getOrCreate(record.tenant_id)

      // Duplicate detection
      const dup = this.findDuplicate(record, tenantRecords, dupConfig)
      if (dup) {
        const event = this.buildLeakageEvent(record, 'ORPHANED', {
          reason: 'duplicate_charge',
          original_record_id: dup.record_id,
          duplicate_record_id: record.record_id,
          window_ms: dupConfig.window_ms,
        })
        duplicates.push(event)
        await this.onLeakage(event)
      }

      // Rate optimization detection
      const rateOpt = this.findRateOptimization(record, tenantRecords, rateConfig)
      if (rateOpt) {
        const event = this.buildLeakageEvent(record, 'OVER_PROVISIONED', {
          reason: 'rate_optimization',
          current_rate: record.rate_per_unit,
          historical_best_rate: rateOpt.rate_per_unit,
          improvement_pct: rateOpt.improvementPct,
        })
        rateOptimizations.push(event)
        await this.onLeakage(event)
      }

      tenantRecords.push(record)
    }

    return { processed: records.length, duplicates, rateOptimizations }
  }

  private getOrCreate(tenantId: string): VendorRecord[] {
    if (!this.records.has(tenantId)) {
      this.records.set(tenantId, [])
    }
    return this.records.get(tenantId)!
  }

  private findDuplicate(
    record: VendorRecord,
    existing: VendorRecord[],
    config: DuplicateDetectionConfig,
  ): VendorRecord | undefined {
    const recordTime = new Date(record.charge_date).getTime()
    return existing.find((r) => {
      if (r.vendor_name !== record.vendor_name) return false
      if (r.service_name !== record.service_name) return false
      if (Math.abs(r.charge_amount_usd - record.charge_amount_usd) > 0.001) return false
      const timeDiff = Math.abs(new Date(r.charge_date).getTime() - recordTime)
      return timeDiff <= config.window_ms
    })
  }

  private findRateOptimization(
    record: VendorRecord,
    existing: VendorRecord[],
    config: RateOptimizationConfig,
  ): { rate_per_unit: number; improvementPct: number } | undefined {
    const sameService = existing.filter(
      (r) => r.vendor_name === record.vendor_name && r.service_name === record.service_name,
    )
    if (sameService.length === 0) return undefined

    const bestHistoricalRate = Math.min(...sameService.map((r) => r.rate_per_unit))
    if (bestHistoricalRate <= 0) return undefined

    const improvementPct =
      ((record.rate_per_unit - bestHistoricalRate) / bestHistoricalRate) * 100

    if (improvementPct >= config.min_improvement_pct) {
      return { rate_per_unit: bestHistoricalRate, improvementPct }
    }
    return undefined
  }

  private buildLeakageEvent(
    record: VendorRecord,
    category: CostLeakageEvent['anomaly_category'],
    details: Record<string, unknown>,
  ): CostLeakageEvent {
    const now = new Date().toISOString()
    return {
      event_id: randomUUID(),
      tenant_id: record.tenant_id,
      resource_id: `vendor:${record.vendor_name}:${record.service_name}`,
      anomaly_category: category,
      hourly_cost_usd: record.charge_amount_usd / 720, // approximate hourly from monthly
      detection_ts: now,
      emission_ts: now,
      threshold_config: {
        vendor_name: record.vendor_name,
        service_name: record.service_name,
        invoice_id: record.invoice_id,
        ...details,
      },
    }
  }
}
