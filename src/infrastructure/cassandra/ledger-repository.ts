import crypto from "crypto";
import cassandra from "cassandra-driver";
import { Readable } from "stream";
import {
  LedgerEntry,
  LedgerEntryInput,
  LedgerQueryFilters,
  IntegrityResult,
  GENESIS_HASH,
} from "./schema";

/** Maximum days allowed in a single exportRange call (Req 9.4). */
const MAX_EXPORT_DAYS = 30;

function computeHash(entryId: string, payload: Record<string, unknown>, prevHash: string): string {
  return crypto
    .createHash("sha256")
    .update(entryId + JSON.stringify(payload) + prevHash)
    .digest("hex");
}

function rowToEntry(row: cassandra.types.Row): LedgerEntry {
  return {
    tenantId: row["tenant_id"] as string,
    yearMonth: row["year_month"] as string,
    sequenceNumber: BigInt(row["sequence_number"].toString()),
    entryId: row["entry_id"].toString() as string,
    entryType: row["entry_type"] as LedgerEntry["entryType"],
    payload: JSON.parse(row["payload"] as string) as Record<string, unknown>,
    agentId: row["agent_id"] as string,
    actionType: row["action_type"] as string,
    resourceId: row["resource_id"] as string,
    ts: row["ts"] as Date,
    entryHash: row["entry_hash"] as string,
    prevHash: row["prev_hash"] as string,
  };
}

/** Derive "YYYY-MM" from a Date. */
function toYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export class LedgerRepository {
  constructor(private readonly client: cassandra.Client) {}

  /**
   * Append a new ledger entry.
   * Fetches the latest entry to build the hash chain, then inserts.
   * Returns the fully-persisted LedgerEntry.
   */
  async append(input: LedgerEntryInput): Promise<LedgerEntry> {
    const latest = await this.getLatestEntry(input.tenantId);
    const prevHash = latest?.entryHash ?? GENESIS_HASH;
    const sequenceNumber = latest !== null ? latest.sequenceNumber + 1n : 0n;
    const entryHash = computeHash(input.entryId, input.payload, prevHash);
    const yearMonth = toYearMonth(input.ts);

    const entry: LedgerEntry = {
      ...input,
      yearMonth,
      sequenceNumber,
      entryHash,
      prevHash,
    };

    const query = `
      INSERT INTO ledger_entries (
        tenant_id, year_month, sequence_number,
        entry_id, entry_type, payload,
        agent_id, action_type, resource_id,
        ts, entry_hash, prev_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.client.execute(
      query,
      [
        entry.tenantId,
        entry.yearMonth,
        cassandra.types.Long.fromString(entry.sequenceNumber.toString()),
        cassandra.types.Uuid.fromString(entry.entryId),
        entry.entryType,
        JSON.stringify(entry.payload),
        entry.agentId,
        entry.actionType,
        entry.resourceId,
        entry.ts,
        entry.entryHash,
        entry.prevHash,
      ],
      { prepare: true }
    );

    return entry;
  }

  /**
   * Query ledger entries for a tenant with optional filters (Req 9.6).
   * Queries across all year_month partitions that overlap the time range.
   */
  async query(tenantId: string, filters: LedgerQueryFilters = {}): Promise<LedgerEntry[]> {
    const { agentId, actionType, resourceId, from, to, limit = 1000 } = filters;

    // Determine which year_month partitions to scan
    const partitions = this.resolvePartitions(from, to);
    const results: LedgerEntry[] = [];

    for (const yearMonth of partitions) {
      let cql = "SELECT * FROM ledger_entries WHERE tenant_id = ? AND year_month = ?";
      const params: unknown[] = [tenantId, yearMonth];

      if (from) {
        cql += " AND ts >= ?";
        params.push(from);
      }
      if (to) {
        cql += " AND ts <= ?";
        params.push(to);
      }
      if (agentId) {
        cql += " AND agent_id = ?";
        params.push(agentId);
      }
      if (actionType) {
        cql += " AND action_type = ?";
        params.push(actionType);
      }
      if (resourceId) {
        cql += " AND resource_id = ?";
        params.push(resourceId);
      }

      cql += " ALLOW FILTERING";

      const rs = await this.client.execute(cql, params, { prepare: true });
      for (const row of rs.rows) {
        results.push(rowToEntry(row));
        if (results.length >= limit) return results;
      }
    }

    return results;
  }

  /**
   * Verify hash chain integrity for a sequence range (Req 9.2, 9.5).
   * Returns the first tampered entry if found.
   */
  async verifyIntegrity(
    tenantId: string,
    fromSeq: bigint,
    toSeq: bigint
  ): Promise<IntegrityResult> {
    // Fetch all entries in the range across all partitions
    const allEntries = await this.query(tenantId, { limit: Number(toSeq - fromSeq) + 1 });
    const entries = allEntries
      .filter((e) => e.sequenceNumber >= fromSeq && e.sequenceNumber <= toSeq)
      .sort((a, b) => (a.sequenceNumber < b.sequenceNumber ? -1 : 1));

    for (const entry of entries) {
      const expected = computeHash(entry.entryId, entry.payload, entry.prevHash);
      if (expected !== entry.entryHash) {
        return { ok: false, tamperedEntry: entry };
      }
    }

    return { ok: true };
  }

  /**
   * Get the most recent ledger entry for a tenant (used for hash chaining).
   * Scans recent partitions in reverse order.
   */
  async getLatestEntry(tenantId: string): Promise<LedgerEntry | null> {
    const now = new Date();
    // Check the last 3 months to find the latest entry
    for (let i = 0; i < 3; i++) {
      const d = new Date(now.getUTCFullYear(), now.getUTCMonth() - i, 1);
      const yearMonth = toYearMonth(d);

      const rs = await this.client.execute(
        "SELECT * FROM ledger_entries WHERE tenant_id = ? AND year_month = ? ORDER BY sequence_number DESC LIMIT 1",
        [tenantId, yearMonth],
        { prepare: true }
      );

      if (rs.rows.length > 0) {
        return rowToEntry(rs.rows[0]);
      }
    }

    return null;
  }

  /**
   * Streaming export for audit — max 30-day range (Req 9.4).
   * Returns a Readable stream of LedgerEntry objects.
   */
  exportRange(tenantId: string, from: Date, to: Date): Readable {
    const diffMs = to.getTime() - from.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays > MAX_EXPORT_DAYS) {
      throw new Error(
        `exportRange: range exceeds ${MAX_EXPORT_DAYS} days (got ${diffDays.toFixed(1)} days)`
      );
    }

    const partitions = this.resolvePartitions(from, to);
    const readable = new Readable({ objectMode: true, read() {} });

    (async () => {
      try {
        for (const yearMonth of partitions) {
          const rs = await this.client.execute(
            "SELECT * FROM ledger_entries WHERE tenant_id = ? AND year_month = ? AND ts >= ? AND ts <= ? ALLOW FILTERING",
            [tenantId, yearMonth, from, to],
            { prepare: true }
          );
          for (const row of rs.rows) {
            readable.push(rowToEntry(row));
          }
        }
        readable.push(null); // signal end
      } catch (err) {
        readable.destroy(err as Error);
      }
    })();

    return readable;
  }

  /**
   * Derive the list of "YYYY-MM" partition keys that overlap [from, to].
   * If no dates provided, returns only the current month.
   */
  private resolvePartitions(from?: Date, to?: Date): string[] {
    const start = from ?? new Date();
    const end = to ?? new Date();

    const partitions: string[] = [];
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));
    const endMonth = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));

    while (cursor <= endMonth) {
      partitions.push(toYearMonth(cursor));
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return partitions;
  }
}
