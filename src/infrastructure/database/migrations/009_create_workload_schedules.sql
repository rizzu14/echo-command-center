-- Migration: 009_create_workload_schedules
-- Carbon-aware workload scheduling records

CREATE TABLE IF NOT EXISTS workload_schedules (
  workload_id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID        NOT NULL REFERENCES tenants (tenant_id),
  original_window       JSONB       NOT NULL DEFAULT '{}',
  scheduled_window      JSONB       NOT NULL DEFAULT '{}',
  max_deferral_deadline TIMESTAMPTZ NOT NULL,
  carbon_savings_kgco2e NUMERIC(12, 4) NOT NULL DEFAULT 0,
  status                TEXT        NOT NULL DEFAULT 'PENDING' CHECK (
    status IN ('PENDING', 'EXECUTING', 'COMPLETED', 'DEFERRED_EXPIRED')
  ),
  is_time_shiftable     BOOLEAN     NOT NULL DEFAULT TRUE,
  energy_kwh            NUMERIC(12, 4) NOT NULL DEFAULT 0,
  region                TEXT        NOT NULL,
  workload_category     TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workload_schedules_tenant_timestamp ON workload_schedules (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_workload_schedules_tenant_status    ON workload_schedules (tenant_id, status);
