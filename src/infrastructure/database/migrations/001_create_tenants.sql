-- Migration: 001_create_tenants
-- Creates the tenants table (admin-only, no RLS)

CREATE TABLE IF NOT EXISTS tenants (
  tenant_id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                       TEXT        NOT NULL,
  tier                       TEXT        NOT NULL CHECK (tier IN ('STARTER', 'PROFESSIONAL', 'ENTERPRISE')),
  dow_protection_limit_usd   NUMERIC(18, 6) NOT NULL DEFAULT 0,
  min_confidence_threshold   SMALLINT    NOT NULL DEFAULT 70 CHECK (min_confidence_threshold BETWEEN 0 AND 100),
  max_reasoning_budget_usd   NUMERIC(18, 6) NOT NULL DEFAULT 10,
  required_resource_tags     TEXT[]      NOT NULL DEFAULT '{}',
  notification_channels      JSONB       NOT NULL DEFAULT '[]',
  provisioned_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  namespace                  TEXT        NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_tenants_namespace ON tenants (namespace);
CREATE INDEX IF NOT EXISTS idx_tenants_tier ON tenants (tier);
