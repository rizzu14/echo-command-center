-- ECHO Liquid Ledger schema
-- Partition key: (tenant_id, year_month) for efficient time-range queries
-- Clustering key: sequence_number ASC for ordered append
-- TTL: 7 years = 220,752,000 seconds (Req 9.3)

USE echo_liquid_ledger;

CREATE TABLE IF NOT EXISTS ledger_entries (
  -- Partition key
  tenant_id       TEXT,
  year_month      TEXT,       -- format: "YYYY-MM"

  -- Clustering key (ascending for ordered reads)
  sequence_number BIGINT,

  -- Entry identity
  entry_id        UUID,
  entry_type      TEXT,       -- e.g. AGENT_ACTION, GOVERNANCE_EVENT, KILL_SWITCH, ROLLBACK, SLA_BREACH, AP2_TRANSACTION

  -- Payload (JSON-serialized)
  payload         TEXT,

  -- Agent context
  agent_id        TEXT,

  -- Separate indexed columns (extracted from payload for efficient querying)
  action_type     TEXT,
  resource_id     TEXT,

  -- Timestamps
  ts              TIMESTAMP,  -- named 'ts' to avoid CQL reserved word 'timestamp'

  -- Hash chain (Req 9.2)
  entry_hash      TEXT,       -- SHA-256(entry_id + JSON.stringify(payload) + prev_hash)
  prev_hash       TEXT,       -- entry_hash of previous entry; GENESIS_HASH for first entry

  PRIMARY KEY ((tenant_id, year_month), sequence_number)
)
WITH CLUSTERING ORDER BY (sequence_number ASC)
AND default_time_to_live = 220752000
AND comment = 'Immutable hash-chained audit ledger for ECHO platform. TTL = 7 years.';

-- Secondary indexes for query patterns (Req 9.6)
CREATE INDEX IF NOT EXISTS ledger_by_agent_id
  ON ledger_entries (agent_id);

CREATE INDEX IF NOT EXISTS ledger_by_action_type
  ON ledger_entries (action_type);

CREATE INDEX IF NOT EXISTS ledger_by_resource_id
  ON ledger_entries (resource_id);

CREATE INDEX IF NOT EXISTS ledger_by_ts
  ON ledger_entries (ts);
