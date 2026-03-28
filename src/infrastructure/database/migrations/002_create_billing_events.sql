-- Migration: 002_create_billing_events
-- Append-only billing events table (no UPDATE/DELETE in RLS)

CREATE TABLE IF NOT EXISTS billing_events (
  event_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID        NOT NULL REFERENCES tenants (tenant_id),
  provider        TEXT        NOT NULL CHECK (provider IN ('AWS', 'AZURE', 'GCP')),
  resource_id     TEXT        NOT NULL,
  resource_type   TEXT        NOT NULL,
  region          TEXT        NOT NULL,
  hourly_cost_usd NUMERIC(18, 6) NOT NULL,
  tags            JSONB       NOT NULL DEFAULT '{}',
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_timestamp  ON billing_events (tenant_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_billing_events_tenant_resource   ON billing_events (tenant_id, resource_id);
