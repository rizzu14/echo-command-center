-- Migration: 007_create_agent_health_status
-- Current health status for each agent per tenant (upserted on heartbeat)

CREATE TABLE IF NOT EXISTS agent_health_status (
  agent_id                          TEXT        NOT NULL,
  tenant_id                         UUID        NOT NULL REFERENCES tenants (tenant_id),
  status                            TEXT        NOT NULL DEFAULT 'HEALTHY' CHECK (
    status IN ('HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'ISOLATED', 'SUSPENDED')
  ),
  last_heartbeat                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_rate_7d_baseline           NUMERIC(12, 4) NOT NULL DEFAULT 0,
  current_action_rate               NUMERIC(12, 4) NOT NULL DEFAULT 0,
  confidence_threshold              SMALLINT    NOT NULL DEFAULT 70 CHECK (confidence_threshold BETWEEN 0 AND 100),
  consecutive_errors_24h            INTEGER     NOT NULL DEFAULT 0,
  reasoning_accuracy_pct            NUMERIC(5, 2) NOT NULL DEFAULT 100,
  structured_hallucination_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0,
  PRIMARY KEY (agent_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_health_tenant_agent     ON agent_health_status (tenant_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_health_tenant_timestamp ON agent_health_status (tenant_id, last_heartbeat);
