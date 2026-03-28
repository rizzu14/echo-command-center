/**
 * LiquidLedger — In-memory implementation (backed by Cassandra in production)
 * Tasks 71–72
 */

import { createHash } from 'crypto'

export interface LedgerEntry {
  entry_id: string
  tenant_id: string
  agent_id: string
  action_type: string
  resource_id?: string
  payload: Record<string, unknown>
  timestamp: string
  sequence_number?: number
  hash?: string
  prev_hash?: string
}

export interface StoredEntry extends LedgerEntry {
  sequence_number: number
  hash: string
  prev_hash: string
}

export interface IntegrityResult {
  valid: boolean
  first_tampered_entry?: StoredEntry
  checked_count: number
}

export interface QueryFilters {
  agent_id?: string
  action_type?: string
  resource_id?: string
  from?: string
  to?: string
}

const MAX_EXPORT_RANGE_DAYS = 30

export class LiquidLedger {
  private entries = new Map<string, StoredEntry[]>() // keyed by tenant_id
  private sequences = new Map<string, number>()

  private getOrCreate(tenantId: string): StoredEntry[] {
    if (!this.entries.has(tenantId)) this.entries.set(tenantId, [])
    return this.entries.get(tenantId)!
  }

  append(entry: LedgerEntry): StoredEntry {
    const tenantEntries = this.getOrCreate(entry.tenant_id)
    const seq = (this.sequences.get(entry.tenant_id) ?? 0) + 1
    this.sequences.set(entry.tenant_id, seq)

    const prev_hash = tenantEntries.length > 0
      ? tenantEntries[tenantEntries.length - 1].hash
      : '0000000000000000000000000000000000000000000000000000000000000000'

    const hashInput = JSON.stringify({
      entry_id: entry.entry_id,
      tenant_id: entry.tenant_id,
      agent_id: entry.agent_id,
      action_type: entry.action_type,
      payload: entry.payload,
      timestamp: entry.timestamp,
      sequence_number: seq,
      prev_hash,
    })

    const hash = createHash('sha256').update(hashInput).digest('hex')

    const stored: StoredEntry = {
      ...entry,
      sequence_number: seq,
      hash,
      prev_hash,
    }

    tenantEntries.push(stored)
    return stored
  }

  verifyIntegrity(tenantId: string, fromSeq: number, toSeq: number): IntegrityResult {
    const tenantEntries = this.getOrCreate(tenantId)
    const range = tenantEntries.filter(
      e => e.sequence_number >= fromSeq && e.sequence_number <= toSeq,
    )

    for (let i = 0; i < range.length; i++) {
      const entry = range[i]
      const prev_hash = i === 0
        ? (range[0].prev_hash)
        : range[i - 1].hash

      const hashInput = JSON.stringify({
        entry_id: entry.entry_id,
        tenant_id: entry.tenant_id,
        agent_id: entry.agent_id,
        action_type: entry.action_type,
        payload: entry.payload,
        timestamp: entry.timestamp,
        sequence_number: entry.sequence_number,
        prev_hash,
      })

      const expectedHash = createHash('sha256').update(hashInput).digest('hex')

      if (expectedHash !== entry.hash) {
        return { valid: false, first_tampered_entry: entry, checked_count: i + 1 }
      }
    }

    return { valid: true, checked_count: range.length }
  }

  query(tenantId: string, filters: QueryFilters = {}): StoredEntry[] {
    const tenantEntries = this.getOrCreate(tenantId)
    return tenantEntries.filter(e => {
      if (filters.agent_id && e.agent_id !== filters.agent_id) return false
      if (filters.action_type && e.action_type !== filters.action_type) return false
      if (filters.resource_id && e.resource_id !== filters.resource_id) return false
      if (filters.from && e.timestamp < filters.from) return false
      if (filters.to && e.timestamp > filters.to) return false
      return true
    })
  }

  exportRange(tenantId: string, from: string, to: string): StoredEntry[] {
    const fromDate = new Date(from)
    const toDate = new Date(to)
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays > MAX_EXPORT_RANGE_DAYS) {
      throw new Error(`Export range exceeds maximum of ${MAX_EXPORT_RANGE_DAYS} days`)
    }

    return this.query(tenantId, { from, to })
  }

  getAll(tenantId: string): StoredEntry[] {
    return [...(this.getOrCreate(tenantId))]
  }
}
