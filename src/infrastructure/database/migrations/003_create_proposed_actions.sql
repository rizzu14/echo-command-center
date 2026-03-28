-- Migration: 003_create_proposed_actions
-- Proposed actions produced by the Reasoning Engine

CREATE TABLE IF NOT EXISTS proposed_actions (
  action_id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id              UUID        NOT NULL REFERENCES tenants (tenant_id),
  action_type            TEXT        NOT NULL,
  target_resources       TEXT[]      NOT NULL DEFAULT '{}',
  parameters             JSONB       NOT NULL DEFAULT '{}',
  reasoning_session_id   UUID        NOT NULL,
  reasoning_tier         TEXT        NOT NULL CHECK (reasoning_tier IN ('FAST', 'MEDIUM', 'DEEP')),
  reasoning_cost_usd     NUMERIC(18, 6) NOT NULL DEFAULT 0,
  projected_savings_usd  NUMERIC(18, 6) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposed_actions_tenant_timestamp  ON proposed_actions (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_proposed_actions_tenant_resource   ON proposed_actions (tenant_id, reasoning_session_id);
