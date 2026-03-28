/**
 * TypeScript types for Redis-backed ECHO data structures.
 */

// ── Infrastructure Snapshot (Digital Twin) ───────────────────────────────────

export type ResourceStatus = "RUNNING" | "STOPPED" | "TERMINATED" | "UNKNOWN";

export interface ResourceMetrics {
  cpu_utilization_pct: number;
  memory_utilization_pct: number;
  storage_utilization_pct: number;
  network_in_bytes_per_sec: number;
  network_out_bytes_per_sec: number;
}

export interface InfrastructureSnapshot {
  resource_id: string;
  tenant_id: string;
  resource_type: string;
  region: string;
  provider: "AWS" | "AZURE" | "GCP";
  status: ResourceStatus;
  hourly_cost_usd: number;
  metrics: ResourceMetrics;
  tags: Record<string, string>;
  captured_at: string; // ISO-8601
}

// ── Cached Plan (Agentic Plan Cache) ─────────────────────────────────────────

export interface CachedPlan {
  plan_id: string;
  tenant_id: string;
  action_type: string;
  resource_id: string;
  parameters: Record<string, unknown>;
  action_hash: string; // SHA-256(actionType + resourceId + JSON.stringify(parameters))
  risk_score: number; // 0–100
  simulation_results: Record<string, unknown>;
  approval_records: ApprovalRecord[];
  projected_savings_usd: number;
  cached_at: string; // ISO-8601
  expires_at: string; // ISO-8601 (cached_at + 90 days)
}

export interface ApprovalRecord {
  approved_by: string;
  approved_at: string; // ISO-8601
  approval_type: "AUTO" | "HUMAN";
}

// ── Agent Health Status ───────────────────────────────────────────────────────

export type AgentStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "UNAVAILABLE"
  | "ISOLATED"
  | "SUSPENDED";

export interface AgentHealthStatus {
  agent_id: string;
  tenant_id: string;
  status: AgentStatus;
  last_heartbeat: string; // ISO-8601
  action_rate_7d_baseline: number;
  current_action_rate: number;
  confidence_threshold: number; // 0–100
  consecutive_errors_24h: number;
  reasoning_accuracy_pct: number;
  structured_hallucination_rate_pct: number;
}
