-- Migration: 010_create_roi_results
-- ROI calculation results per executed action

CREATE TABLE IF NOT EXISTS roi_results (
  action_id                UUID        PRIMARY KEY REFERENCES proposed_actions (action_id),
  tenant_id                UUID        NOT NULL REFERENCES tenants (tenant_id),
  cost_savings_usd         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  execution_cost_usd       NUMERIC(18, 6) NOT NULL DEFAULT 0,
  reasoning_cost_usd       NUMERIC(18, 6) NOT NULL DEFAULT 0,
  platform_cost_usd        NUMERIC(18, 6) NOT NULL DEFAULT 0,
  avoided_loss_usd         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  net_roi_pct              NUMERIC(10, 4) NOT NULL DEFAULT 0,
  cost_per_correct_result  NUMERIC(18, 6) NOT NULL DEFAULT 0,
  calculated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roi_results_tenant_timestamp ON roi_results (tenant_id, calculated_at);
