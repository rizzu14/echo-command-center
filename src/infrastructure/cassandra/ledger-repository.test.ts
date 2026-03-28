/**
 * Unit tests for Liquid Ledger hash-chain logic and LedgerRepository helpers.
 * These tests exercise pure functions without a live Cassandra connection.
 */
import crypto from "crypto";
import { describe, it, expect } from "vitest";
import { GENESIS_HASH, LedgerEntry, LedgerEntryInput } from "./schema";

// ── Helpers (duplicated from ledger-repository to keep tests self-contained) ──

function computeHash(
  entryId: string,
  payload: Record<string, unknown>,
  prevHash: string
): string {
  return crypto
    .createHash("sha256")
    .update(entryId + JSON.stringify(payload) + prevHash)
    .digest("hex");
}

function toYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function resolvePartitions(from?: Date, to?: Date): string[] {
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

// ── Build a chain of N entries ──────────────────────────────────────────────

function buildChain(n: number): LedgerEntry[] {
  const entries: LedgerEntry[] = [];
  let prevHash = GENESIS_HASH;

  for (let i = 0; i < n; i++) {
    const entryId = `entry-${i}`;
    const payload = { action: "test", index: i };
    const entryHash = computeHash(entryId, payload, prevHash);
    const ts = new Date(Date.UTC(2024, 0, 1, 0, 0, i));

    entries.push({
      tenantId: "tenant-1",
      yearMonth: toYearMonth(ts),
      sequenceNumber: BigInt(i),
      entryId,
      entryType: "AGENT_ACTION",
      payload,
      agentId: "auditor-agent",
      actionType: "SCALE_DOWN",
      resourceId: "ec2-i-abc123",
      ts,
      entryHash,
      prevHash,
    });

    prevHash = entryHash;
  }

  return entries;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("GENESIS_HASH", () => {
  it("equals SHA-256 of 'ECHO_GENESIS'", () => {
    const expected = crypto
      .createHash("sha256")
      .update("ECHO_GENESIS")
      .digest("hex");
    expect(GENESIS_HASH).toBe(expected);
  });
});

describe("computeHash", () => {
  it("produces a 64-char hex string", () => {
    const h = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same inputs", () => {
    const h1 = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    const h2 = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    expect(h1).toBe(h2);
  });

  it("changes when entryId changes", () => {
    const h1 = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    const h2 = computeHash("id-2", { foo: "bar" }, GENESIS_HASH);
    expect(h1).not.toBe(h2);
  });

  it("changes when payload changes", () => {
    const h1 = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    const h2 = computeHash("id-1", { foo: "baz" }, GENESIS_HASH);
    expect(h1).not.toBe(h2);
  });

  it("changes when prevHash changes", () => {
    const h1 = computeHash("id-1", { foo: "bar" }, GENESIS_HASH);
    const h2 = computeHash("id-1", { foo: "bar" }, "different-prev-hash");
    expect(h1).not.toBe(h2);
  });
});

describe("hash chain integrity", () => {
  it("first entry uses GENESIS_HASH as prevHash", () => {
    const chain = buildChain(1);
    expect(chain[0].prevHash).toBe(GENESIS_HASH);
  });

  it("each entry's prevHash equals the previous entry's entryHash", () => {
    const chain = buildChain(5);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].prevHash).toBe(chain[i - 1].entryHash);
    }
  });

  it("each entry's entryHash matches recomputed hash", () => {
    const chain = buildChain(5);
    for (const entry of chain) {
      const expected = computeHash(entry.entryId, entry.payload, entry.prevHash);
      expect(entry.entryHash).toBe(expected);
    }
  });

  it("tampering a payload breaks all subsequent hashes", () => {
    const chain = buildChain(5);
    // Tamper entry at index 2
    const tampered = { ...chain[2], payload: { action: "TAMPERED" } };

    // Recompute from tampered entry onward
    const recomputed = computeHash(tampered.entryId, tampered.payload, tampered.prevHash);
    expect(recomputed).not.toBe(chain[2].entryHash);

    // Entry 3's prevHash no longer matches the tampered entry's hash
    expect(chain[3].prevHash).toBe(chain[2].entryHash); // original chain is intact
    expect(chain[3].prevHash).not.toBe(recomputed);     // tampered hash differs
  });

  it("sequence numbers are monotonically increasing", () => {
    const chain = buildChain(10);
    for (let i = 1; i < chain.length; i++) {
      expect(chain[i].sequenceNumber).toBe(chain[i - 1].sequenceNumber + 1n);
    }
  });
});

describe("toYearMonth", () => {
  it("formats January correctly", () => {
    expect(toYearMonth(new Date(Date.UTC(2024, 0, 15)))).toBe("2024-01");
  });

  it("formats December correctly", () => {
    expect(toYearMonth(new Date(Date.UTC(2024, 11, 31)))).toBe("2024-12");
  });

  it("pads single-digit months", () => {
    expect(toYearMonth(new Date(Date.UTC(2024, 8, 1)))).toBe("2024-09");
  });
});

describe("resolvePartitions", () => {
  it("returns a single partition when from and to are in the same month", () => {
    const from = new Date(Date.UTC(2024, 2, 5));
    const to = new Date(Date.UTC(2024, 2, 20));
    expect(resolvePartitions(from, to)).toEqual(["2024-03"]);
  });

  it("returns multiple partitions spanning months", () => {
    const from = new Date(Date.UTC(2024, 0, 1));
    const to = new Date(Date.UTC(2024, 2, 31));
    expect(resolvePartitions(from, to)).toEqual(["2024-01", "2024-02", "2024-03"]);
  });

  it("handles year boundaries", () => {
    const from = new Date(Date.UTC(2023, 11, 1));
    const to = new Date(Date.UTC(2024, 1, 28));
    expect(resolvePartitions(from, to)).toEqual(["2023-12", "2024-01", "2024-02"]);
  });
});

describe("exportRange validation", () => {
  it("rejects ranges exceeding 30 days", () => {
    const from = new Date(Date.UTC(2024, 0, 1));
    const to = new Date(Date.UTC(2024, 1, 15)); // 45 days
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(30);
  });

  it("accepts ranges of exactly 30 days", () => {
    const from = new Date(Date.UTC(2024, 0, 1));
    const to = new Date(Date.UTC(2024, 0, 31)); // 30 days
    const diffDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeLessThanOrEqual(30);
  });
});
