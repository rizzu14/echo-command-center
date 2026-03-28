-- Migration: 008_create_sla_contracts
-- SLA contract digital twin records

CREATE TABLE IF NOT EXISTS sla_contracts (
  contract_id      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL REFERENCES tenants (tenant_id),
  vendor_name      TEXT        NOT NULL,
  service_name     TEXT        NOT NULL,
  terms            JSONB       NOT NULL DEFAULT '[]',
  penalty_schedule JSONB       NOT NULL DEFAULT '{}',
  effective_from   TIMESTAMPTZ NOT NULL,
  effective_to     TIMESTAMPTZ NOT NULL,
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  state            TEXT        NOT NULL DEFAULT 'HEALTHY' CHECK (
    state IN ('HEALTHY', 'WARNING', 'BREACHED', 'REMEDIATED')
  ),
  monthly_fee_usd  NUMERIC(18, 6) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_sla_contracts_tenant_timestamp ON sla_contracts (tenant_id, ingested_at);
CREATE INDEX IF NOT EXISTS idx_sla_contracts_tenant_state     ON sla_contracts (tenant_id, state);
