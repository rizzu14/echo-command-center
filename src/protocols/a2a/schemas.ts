// ─── A2A Protocol Schemas ─────────────────────────────────────────────────────
// Agent-to-Agent protocol for inter-agent communication

export type AgentType =
  | 'auditor'
  | 'governor'
  | 'green-architect'
  | 'finance'
  | 'orchestrator'
  | 'execution-engine'
  | 'external';

export type TrustLevel = 'internal' | 'tenant-trusted' | 'platform-trusted' | 'untrusted';

export type A2ATaskType =
  | 'cost_leakage_analysis'
  | 'governance_check'
  | 'carbon_schedule'
  | 'roi_calculation'
  | 'execution_request'
  | 'health_check'
  | 'delegation';

/**
 * AgentCard — identity and capability descriptor for an agent.
 * Shared during trust negotiation.
 */
export interface AgentCard {
  agent_id: string;
  agent_type: AgentType;
  tenant_id: string;
  capabilities: string[];
  endpoint: string;
  public_key: string;       // PEM-encoded public key for signature verification
  trust_level: TrustLevel;
  issued_at: string;        // ISO-8601
  expires_at: string;       // ISO-8601
}

/**
 * A2AMessage — a signed inter-agent message.
 */
export interface A2AMessage {
  message_id: string;
  from_agent: string;       // agent_id
  to_agent: string;         // agent_id
  tenant_id: string;
  task_type: A2ATaskType;
  payload: Record<string, unknown>;
  correlation_id: string;
  timestamp: string;        // ISO-8601
  signature: string;        // HMAC-SHA256 hex of canonical message body
}

/**
 * A2ARequest — outbound request from one agent to another.
 */
export interface A2ARequest {
  request_id: string;
  from_agent: string;
  to_agent: string;
  tenant_id: string;
  task_type: A2ATaskType;
  payload: Record<string, unknown>;
  timeout_ms?: number;
}

/**
 * A2AResponse — response to an A2ARequest.
 */
export interface A2AResponse {
  request_id: string;
  from_agent: string;
  to_agent: string;
  tenant_id: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  latency_ms: number;
}

/**
 * TrustNegotiationResult — outcome of trust negotiation between two agents.
 */
export interface TrustNegotiationResult {
  accepted: boolean;
  trust_level: TrustLevel;
  shared_anchor?: string;   // tenant-scoped trust anchor token
  reason?: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isA2AMessage(obj: unknown): obj is A2AMessage {
  if (typeof obj !== 'object' || obj === null) return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m['message_id'] === 'string' &&
    typeof m['from_agent'] === 'string' &&
    typeof m['to_agent'] === 'string' &&
    typeof m['tenant_id'] === 'string' &&
    typeof m['task_type'] === 'string' &&
    typeof m['payload'] === 'object' &&
    m['payload'] !== null &&
    typeof m['correlation_id'] === 'string' &&
    typeof m['timestamp'] === 'string' &&
    typeof m['signature'] === 'string'
  );
}

export function isAgentCard(obj: unknown): obj is AgentCard {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    typeof c['agent_id'] === 'string' &&
    typeof c['agent_type'] === 'string' &&
    typeof c['tenant_id'] === 'string' &&
    Array.isArray(c['capabilities']) &&
    typeof c['endpoint'] === 'string' &&
    typeof c['public_key'] === 'string' &&
    typeof c['trust_level'] === 'string'
  );
}
