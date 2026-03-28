// Agent types
export type AgentType = 'AUDITOR' | 'GOVERNOR' | 'GREEN_ARCHITECT' | 'FINANCE';
export type AgentStatus = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'ISOLATED' | 'SUSPENDED';

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  lastAction: string;
  lastActionTs: string;
  healthScore: number; // 0-100
  confidenceThreshold: number; // 0-100
  reasoningAccuracy: number; // 0-100
  hallucinationRate: number; // 0-100 (lower is better)
  actionsToday: number;
  lastReasoningChain?: string;
}

// Cost leakage
export type AnomalyCategory = 'IDLE' | 'OVER_PROVISIONED' | 'ORPHANED' | 'USAGE_SPIKE';

export interface CostLeakageEvent {
  eventId: string;
  tenantId: string;
  resourceId: string;
  anomalyCategory: AnomalyCategory;
  hourlyCostUsd: number;
  detectionTs: string;
  costImpactMath: string;
  region: string;
  provider: 'AWS' | 'Azure' | 'GCP';
}

// Actions
export type ActionType =
  | 'RIGHTSIZING'
  | 'SCHEDULE_SHUTDOWN'
  | 'TERMINATE_ORPHAN'
  | 'WORKLOAD_MIGRATION'
  | 'RESERVED_INSTANCE_PURCHASE'
  | 'SPOT_MIGRATION';

export type ApprovalState =
  | 'PENDING_SIMULATION'
  | 'SIMULATION_PASSED'
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'ROLLED_BACK';

export type SimulationStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
export type ReasoningTier = 'FAST' | 'MEDIUM' | 'DEEP';

export interface CostMath {
  currentCostUsd: number;
  optimizedCostUsd: number;
  hoursPerMonth: number;
  formula: string;
  projectedMonthlySavings: number;
}

export interface Action {
  actionId: string;
  type: ActionType;
  targetResources: string[];
  riskScore: number; // 0-100
  confidenceThreshold: number; // 0-100
  approvalState: ApprovalState;
  simulationStatus: SimulationStatus;
  projectedSavings: number;
  costMath: CostMath;
  reasoningTier: ReasoningTier;
  createdAt: string;
  agentId: string;
  reasoning?: string;
}

// ROI
export interface ROISummary {
  cumulativeRoi: number; // percentage
  projectedAnnualSavings: number;
  costPerInsight: number;
  totalSavingsUsd: number;
  platformCostUsd: number;
  sparklineData: { date: string; value: number }[];
}

// A2A Messages
export type A2ATaskType =
  | 'ANOMALY_DETECTED'
  | 'ACTION_PROPOSED'
  | 'GOVERNANCE_CHECK'
  | 'CARBON_ANALYSIS'
  | 'ROI_CALCULATION'
  | 'SIMULATION_REQUEST'
  | 'APPROVAL_REQUIRED'
  | 'EXECUTION_COMPLETE';

export interface A2AMessage {
  messageId: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  taskType: A2ATaskType;
  timestamp: string;
  payloadPreview: string;
  latencyMs: number;
}

// Carbon
export interface CarbonRegionData {
  region: string;
  savingsKgCo2e: number;
}

export interface CarbonSummary {
  monthlySavingsKgCo2e: number;
  workloadCategory: string;
  region: string;
  byRegion: CarbonRegionData[];
  trend: number; // % change vs last month
}

// Governance
export interface GovernanceReport {
  actionsTotal: number;
  actionsBlocked: number;
  killSwitchEvents: number;
  dowTriggers: number;
  date: string;
  complianceScore: number; // 0-100
}

// Model performance
export type ModelTier = 'FAST' | 'MEDIUM' | 'DEEP';

export interface ModelPerformance {
  provider: string;
  model: string;
  latencyMs: number;
  costPerToken: number;
  accuracyPct: number;
  tier: ModelTier;
  requestsToday: number;
}

// Reasoning accuracy chart data
export interface ReasoningDataPoint {
  date: string;
  [agentId: string]: number | string;
}

// DoW (Deed of Work) config
export interface DoWConfig {
  dailySpendLimitUsd: number;
  currentRollingSpendUsd: number;
  lastTriggeredTs: string | null;
  alertThresholdPct: number;
}

// WebSocket event types
export type WsEventType =
  | 'COST_LEAKAGE_EVENT'
  | 'AGENT_HEALTH_UPDATE'
  | 'ACTION_UPDATE'
  | 'A2A_MESSAGE'
  | 'ROI_UPDATE'
  | 'CARBON_UPDATE'
  | 'GOVERNANCE_EVENT'
  | 'KILL_SWITCH_EVENT';

export interface WsEvent {
  type: WsEventType;
  payload: unknown;
  timestamp: string;
  tenantId: string;
}

// Navigation
export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: string;
}
