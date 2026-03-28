/**
 * TypeScript type definitions matching the PostgreSQL schema.
 * All timestamps are ISO-8601 strings (TIMESTAMPTZ stored as UTC).
 * All monetary values are strings to preserve NUMERIC precision from pg driver.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type TenantTier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

export type CloudProvider = 'AWS' | 'AZURE' | 'GCP';

export type ReasoningTier = 'FAST' | 'MEDIUM' | 'DEEP';

export type ApprovalState =
  | 'PENDING'
  | 'APPROVED'
  | 'BLOCKED'
  | 'QUEUED'
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'FLAG_FOR_HUMAN_REVIEW'
  | 'AUTO_EXECUTE'
  | 'AUTO_EXECUTE_CACHED';

export type AgentStatus =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'UNAVAILABLE'
  | 'ISOLATED'
  | 'SUSPENDED';

export type SLAContractState = 'HEALTHY' | 'WARNING' | 'BREACHED' | 'REMEDIATED';

export type WorkloadStatus =
  | 'PENDING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'DEFERRED_EXPIRED';

// ---------------------------------------------------------------------------
// Row types (match column names returned by pg driver)
// ---------------------------------------------------------------------------

/** Row from the `tenants` table. */
export interface TenantRow {
  tenant_id: string;
  name: string;
  tier: TenantTier;
  dow_protection_limit_usd: string;
  min_confidence_threshold: number;
  max_reasoning_budget_usd: string;
  required_resource_tags: string[];
  notification_channels: object[];
  provisioned_at: string;
  namespace: string;
}

/** Row from the `billing_events` table. */
export interface BillingEventRow {
  event_id: string;
  tenant_id: string;
  provider: CloudProvider;
  resource_id: string;
  resource_type: string;
  region: string;
  hourly_cost_usd: string;
  tags: Record<string, string>;
  timestamp: string;
}

/** Row from the `proposed_actions` table. */
export interface ProposedActionRow {
  action_id: string;
  tenant_id: string;
  action_type: string;
  target_resources: string[];
  parameters: Record<string, unknown>;
  reasoning_session_id: string;
  reasoning_tier: ReasoningTier;
  reasoning_cost_usd: string;
  projected_savings_usd: string;
  created_at: string;
}

/** Row from the `scored_actions` table. */
export interface ScoredActionRow {
  action_id: string;
  tenant_id: string;
  risk_score: number;
  confidence_threshold: number;
  simulation_result: object;
  projected_roi: string;
  approval_state: ApprovalState;
  scored_at: string;
}

/** Row from the `execution_outcomes` table. */
export interface ExecutionOutcomeRow {
  action_id: string;
  tenant_id: string;
  executed_at: string;
  actual_savings_usd: string;
  simulation_deviation_pct: string;
  rollback_triggered: boolean;
  rollback_completed_at: string | null;
}

/** Row from the `reasoning_sessions` table. */
export interface ReasoningSessionRow {
  session_id: string;
  tenant_id: string;
  tier: ReasoningTier;
  model_provider: string;
  model_id: string;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: string;
  latency_ms: number;
  outcome_matched_projection: boolean | null;
  budget_exhausted: boolean;
  completeness_pct: string | null;
  created_at: string;
}

/** Row from the `agent_health_status` table. */
export interface AgentHealthStatusRow {
  agent_id: string;
  tenant_id: string;
  status: AgentStatus;
  last_heartbeat: string;
  action_rate_7d_baseline: string;
  current_action_rate: string;
  confidence_threshold: number;
  consecutive_errors_24h: number;
  reasoning_accuracy_pct: string;
  structured_hallucination_rate_pct: string;
}

/** Row from the `sla_contracts` table. */
export interface SLAContractRow {
  contract_id: string;
  tenant_id: string;
  vendor_name: string;
  service_name: string;
  terms: object[];
  penalty_schedule: object;
  effective_from: string;
  effective_to: string;
  ingested_at: string;
  state: SLAContractState;
  monthly_fee_usd: string;
}

/** Row from the `workload_schedules` table. */
export interface WorkloadScheduleRow {
  workload_id: string;
  tenant_id: string;
  original_window: object;
  scheduled_window: object;
  max_deferral_deadline: string;
  carbon_savings_kgco2e: string;
  status: WorkloadStatus;
  is_time_shiftable: boolean;
  energy_kwh: string;
  region: string;
  workload_category: string;
  created_at: string;
}

/** Row from the `roi_results` table. */
export interface ROIResultRow {
  action_id: string;
  tenant_id: string;
  cost_savings_usd: string;
  execution_cost_usd: string;
  reasoning_cost_usd: string;
  platform_cost_usd: string;
  avoided_loss_usd: string;
  net_roi_pct: string;
  cost_per_correct_result: string;
  calculated_at: string;
}
