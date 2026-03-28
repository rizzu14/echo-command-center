/**
 * TypeScript types for the ECHO Liquid Ledger (Cassandra-backed).
 * Mirrors the `ledger_entries` table in schema.cql.
 */

export type LedgerEntryType =
  | "AGENT_ACTION"
  | "GOVERNANCE_EVENT"
  | "KILL_SWITCH"
  | "ROLLBACK"
  | "SLA_BREACH"
  | "AP2_TRANSACTION"
  | "PROMPT_INJECTION_DETECTED"
  | "ROGUE_AGENT_CONTAINED"
  | "UNAUTHORIZED_ACCESS_ATTEMPT"
  | "GENESIS";

/** A fully-persisted ledger entry (as read from Cassandra). */
export interface LedgerEntry {
  tenantId: string;
  yearMonth: string; // "YYYY-MM"
  sequenceNumber: bigint;
  entryId: string; // UUID
  entryType: LedgerEntryType;
  payload: Record<string, unknown>; // stored as JSON TEXT in Cassandra
  agentId: string;
  actionType: string; // extracted from payload for indexing
  resourceId: string; // extracted from payload for indexing
  ts: Date;
  entryHash: string; // SHA-256(entryId + JSON.stringify(payload) + prevHash)
  prevHash: string; // entryHash of previous entry; GENESIS_HASH for first
}

/** Input required to append a new ledger entry (before hash computation). */
export interface LedgerEntryInput {
  tenantId: string;
  entryId: string; // caller-supplied UUID
  entryType: LedgerEntryType;
  payload: Record<string, unknown>;
  agentId: string;
  actionType: string;
  resourceId: string;
  ts: Date;
}

/** Query filters for LedgerRepository.query(). */
export interface LedgerQueryFilters {
  agentId?: string;
  actionType?: string;
  resourceId?: string;
  from?: Date;
  to?: Date;
  /** Maximum number of entries to return (default: 1000). */
  limit?: number;
}

/** Result of an integrity verification run. */
export interface IntegrityResult {
  ok: boolean;
  /** First tampered entry found, if any. */
  tamperedEntry?: LedgerEntry;
}

/** SHA-256 of the string "ECHO_GENESIS" — used as prev_hash for the first entry. */
export const GENESIS_HASH =
  "c1f575840d784d4e58e34ab90d85834910ccc401bfe096e9cc2b9ce27d8e031a"; // SHA-256("ECHO_GENESIS")
