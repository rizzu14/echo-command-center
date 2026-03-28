-- Migration: 006_create_reasoning_sessions
-- Append-only reasoning session records (no UPDATE/DELETE in RLS)

CREATE TABLE IF NOT EXISTS reasoning_sessions (
  session_id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID        NOT NULL REFERENCES tenants (tenant_id),
  tier                        TEXT        NOT NULL CHECK (tier IN ('FAST', 'MEDIUM', 'DEEP')),
  model_provider              TEXT        NOT NULL,
  model_id                    TEXT        NOT NULL,
  prompt_tokens               INTEGER     NOT NULL DEFAULT 0,
  completion_tokens           INTEGER     NOT NULL DEFAULT 0,
  cost_usd                    NUMERIC(18, 6) NOT NULL DEFAULT 0,
  latency_ms                  INTEGER     NOT NULL DEFAULT 0,
  outcome_matched_projection  BOOLEAN,
  budget_exhausted            BOOLEAN     NOT NULL DEFAULT FALSE,
  completeness_pct            NUMERIC(5, 2),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reasoning_sessions_tenant_timestamp ON reasoning_sessions (tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reasoning_sessions_tenant_tier      ON reasoning_sessions (tenant_id, tier);
