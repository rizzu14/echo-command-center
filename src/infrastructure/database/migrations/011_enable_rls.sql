-- Migration: 011_enable_rls
-- Creates the app_user role and enables Row-Level Security on all tenant-scoped tables.
-- The tenants table is admin-only and is NOT subject to RLS.
-- All application connections must use the app_user role and set
-- app.current_tenant_id via: SET LOCAL app.current_tenant_id = '<uuid>'

-- ---------------------------------------------------------------------------
-- 1. Create the application role (non-superuser)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;

-- Grant connect on the current database
GRANT CONNECT ON DATABASE CURRENT_DATABASE() TO app_user;

-- Grant usage on the public schema
GRANT USAGE ON SCHEMA public TO app_user;

-- Grant DML on all tenant-scoped tables (tenants table excluded — admin only)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  billing_events,
  proposed_actions,
  scored_actions,
  execution_outcomes,
  reasoning_sessions,
  agent_health_status,
  sla_contracts,
  workload_schedules,
  roi_results
TO app_user;

-- Grant SELECT on tenants so app_user can resolve tenant_id lookups
GRANT SELECT ON TABLE tenants TO app_user;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS on all tenant-scoped tables
-- ---------------------------------------------------------------------------
ALTER TABLE billing_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposed_actions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scored_actions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_outcomes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reasoning_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_health_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_contracts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workload_schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_results           ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners (prevents accidental bypass)
ALTER TABLE billing_events        FORCE ROW LEVEL SECURITY;
ALTER TABLE proposed_actions      FORCE ROW LEVEL SECURITY;
ALTER TABLE scored_actions        FORCE ROW LEVEL SECURITY;
ALTER TABLE execution_outcomes    FORCE ROW LEVEL SECURITY;
ALTER TABLE reasoning_sessions    FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_health_status   FORCE ROW LEVEL SECURITY;
ALTER TABLE sla_contracts         FORCE ROW LEVEL SECURITY;
ALTER TABLE workload_schedules    FORCE ROW LEVEL SECURITY;
ALTER TABLE roi_results           FORCE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. RLS policies — tenant_id predicate on every operation
-- ---------------------------------------------------------------------------

-- Helper macro: current tenant UUID from session variable
-- Usage: SET LOCAL app.current_tenant_id = '<uuid>';

-- ---- billing_events (append-only: SELECT + INSERT only) ----
CREATE POLICY billing_events_select ON billing_events
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY billing_events_insert ON billing_events
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- proposed_actions ----
CREATE POLICY proposed_actions_select ON proposed_actions
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY proposed_actions_insert ON proposed_actions
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY proposed_actions_update ON proposed_actions
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY proposed_actions_delete ON proposed_actions
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- scored_actions ----
CREATE POLICY scored_actions_select ON scored_actions
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY scored_actions_insert ON scored_actions
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY scored_actions_update ON scored_actions
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY scored_actions_delete ON scored_actions
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- execution_outcomes ----
CREATE POLICY execution_outcomes_select ON execution_outcomes
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY execution_outcomes_insert ON execution_outcomes
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY execution_outcomes_update ON execution_outcomes
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY execution_outcomes_delete ON execution_outcomes
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- reasoning_sessions (append-only: SELECT + INSERT only) ----
CREATE POLICY reasoning_sessions_select ON reasoning_sessions
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY reasoning_sessions_insert ON reasoning_sessions
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- agent_health_status ----
CREATE POLICY agent_health_status_select ON agent_health_status
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY agent_health_status_insert ON agent_health_status
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY agent_health_status_update ON agent_health_status
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY agent_health_status_delete ON agent_health_status
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- sla_contracts ----
CREATE POLICY sla_contracts_select ON sla_contracts
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sla_contracts_insert ON sla_contracts
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sla_contracts_update ON sla_contracts
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY sla_contracts_delete ON sla_contracts
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- workload_schedules ----
CREATE POLICY workload_schedules_select ON workload_schedules
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY workload_schedules_insert ON workload_schedules
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY workload_schedules_update ON workload_schedules
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY workload_schedules_delete ON workload_schedules
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- ---- roi_results ----
CREATE POLICY roi_results_select ON roi_results
  FOR SELECT TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY roi_results_insert ON roi_results
  FOR INSERT TO app_user
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY roi_results_update ON roi_results
  FOR UPDATE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY roi_results_delete ON roi_results
  FOR DELETE TO app_user
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
