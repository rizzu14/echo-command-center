-- ECHO Liquid Ledger — cold-tier archival tracking
-- Tracks entries older than 90 days that have been tiered to object storage
-- (S3 / Azure Blob / GCS). Hot storage retains the index row; payload is
-- replaced with an object-storage reference.

USE echo_liquid_ledger;

-- Materialized view: cold entries (sequence_number < current - 90-day window)
-- Because Cassandra MV filtering on a non-primary-key column is limited,
-- we use a separate tracking table that the archival job writes to.

CREATE TABLE IF NOT EXISTS cold_tier_index (
  tenant_id         TEXT,
  year_month        TEXT,       -- "YYYY-MM" of the original entry
  sequence_number   BIGINT,

  -- Original entry metadata (kept in hot storage for query routing)
  entry_id          UUID,
  entry_type        TEXT,
  agent_id          TEXT,
  action_type       TEXT,
  resource_id       TEXT,
  ts                TIMESTAMP,
  entry_hash        TEXT,       -- retained for integrity verification

  -- Object-storage location of the archived payload
  archive_uri       TEXT,       -- e.g. s3://echo-ledger-archive/tenant/YYYY-MM/seq.json.gz
  archived_at       TIMESTAMP,

  PRIMARY KEY ((tenant_id, year_month), sequence_number)
)
WITH CLUSTERING ORDER BY (sequence_number ASC)
AND comment = 'Cold-tier index: entries older than 90 days archived to object storage. Payload lives in archive_uri.';

-- Index to find all cold entries for a given agent or resource
CREATE INDEX IF NOT EXISTS cold_tier_by_agent_id
  ON cold_tier_index (agent_id);

CREATE INDEX IF NOT EXISTS cold_tier_by_resource_id
  ON cold_tier_index (resource_id);
