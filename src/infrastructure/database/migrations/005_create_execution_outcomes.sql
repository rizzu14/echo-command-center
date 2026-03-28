-- Migration: 005_create_execution_outcomes
-- Records the actual outcome of each executed action

CREATE TABLE IF NOT EXISTS execution_outcomes (
  action_id               UUID        PRIMARY KEY REFERENCES proposed_actions (action_id),
  tenant_id               UUID        NOT NULL REFERENCES tenants (tenant_id),
  executed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_savings_usd      NUMERIC(18, 6) NOT NULL DEFAULT 0,
  simulation_deviation_pct NUMERIC(8, 4) NOT NULL DEFAULT 0,
  rollback_triggered      BOOLEAN     NOT NULL DEFAULT FALSE,
  rollback_completed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_execution_outcomes_tenant_timestamp ON execution_outcomes (tenant_id, executed_at);
CREATE INDEX IF NOT EXISTS idx_execution_outcomes_tenant_rollback  ON execution_outcomes (tenant_id, rollback_triggered);
