-- Migration: 004_create_scored_actions
-- Scored actions extend proposed_actions with risk scoring and approval state.
-- Implemented as a separate table with FK to proposed_actions for clean separation.

CREATE TABLE IF NOT EXISTS scored_actions (
  action_id            UUID        PRIMARY KEY REFERENCES proposed_actions (action_id),
  tenant_id            UUID        NOT NULL REFERENCES tenants (tenant_id),
  risk_score           SMALLINT    NOT NULL CHECK (risk_score BETWEEN 0 AND 100),
  confidence_threshold SMALLINT    NOT NULL CHECK (confidence_threshold BETWEEN 0 AND 100),
  simulation_result    JSONB       NOT NULL DEFAULT '{}',
  projected_roi        NUMERIC(18, 6) NOT NULL DEFAULT 0,
  approval_state       TEXT        NOT NULL DEFAULT 'PENDING' CHECK (
    approval_state IN (
      'PENDING',
      'APPROVED',
      'BLOCKED',
      'QUEUED',
      'REQUIRE_HUMAN_APPROVAL',
      'FLAG_FOR_HUMAN_REVIEW',
      'AUTO_EXECUTE',
      'AUTO_EXECUTE_CACHED'
    )
  ),
  scored_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scored_actions_tenant_timestamp     ON scored_actions (tenant_id, scored_at);
CREATE INDEX IF NOT EXISTS idx_scored_actions_tenant_approval      ON scored_actions (tenant_id, approval_state);
