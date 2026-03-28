# Design Document: ECHO Autonomous Economic Operating System

## Overview

ECHO (Autonomous Economic Operating System) is an enterprise-grade, multi-tenant SaaS platform that continuously monitors cloud infrastructure spending, applies tiered AI reasoning to identify cost inefficiencies, simulates proposed optimizations against a digital twin, and autonomously executes approved actions within a governed, auditable operating environment.

The platform targets Fortune 500 CFOs, CTOs, and enterprise operators who require measurable financial ROI from AI-driven infrastructure decisions. ECHO is delivered on Kubernetes across AWS, Azure, and GCP with enterprise pricing tiers.

### Design Goals

- Sub-second to 2-minute reasoning latency across three tiers, with composite signal routing
- Zero uncontrolled financial actions — every execution path passes through simulation, risk scoring, and governance
- Tamper-proof audit trail for 7-year regulatory retention
- Multi-model AI provider abstraction — no single-vendor lock-in
- Tenant isolation at every layer: storage, network, agent execution, and reasoning

### Key Architectural Decisions

1. **Event-driven core**: Apache Kafka as the central event bus. All inter-component communication is asynchronous and event-sourced, enabling replay, audit, and horizontal scaling.
2. **Three-tier reasoning with composite routing**: Routing decisions use `composite_signal = f(Risk_Score, financial_impact, tenant_config)` — not risk score alone. This avoids the 30x latency tax of deep reasoning on low-stakes tasks.
3. **Digital twin before execution**: No action reaches production without first running against a stateful digital twin simulation.
4. **Dual independent reasoning chains for Deep Mode**: Structured hallucination defense requires two independent chains with contradiction detection before any Deep Mode output is committed.
5. **Hash-chained ledger**: Every agent action is cryptographically chained, making tamper detection O(n) over the chain.

---

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          ECHO Platform (per Tenant namespace)                   │
│                                                                                 │
│  ┌──────────────────────────────────────────────────────────────────────────┐   │
│  │                        Data Ingestion Layer                              │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │   │
│  │  │ AWS Cost     │  │ Azure Cost   │  │ GCP Billing  │  │ Carbon      │ │   │
│  │  │ Explorer     │  │ Management   │  │ API          │  │ Intensity   │ │   │
│  │  │ Connector    │  │ Connector    │  │ Connector    │  │ API         │ │   │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘ │   │
│  │         └─────────────────┴─────────────────┴─────────────────┘        │   │
│  │                                    │                                    │   │
│  │                         ┌──────────▼──────────┐                        │   │
│  │                         │   Apache Kafka Bus   │                        │   │
│  │                         │  (Event Streaming)   │                        │   │
│  │                         └──────────┬──────────┘                        │   │
│  └────────────────────────────────────┼──────────────────────────────────-┘   │
│                                       │                                        │
│  ┌────────────────────────────────────▼──────────────────────────────────────┐ │
│  │                         Agent OS Layer                                    │ │
│  │  ┌─────────────────────────────────────────────────────────────────────┐ │ │
│  │  │                      Agent_Orchestrator                             │ │ │
│  │  │  (Event routing, health monitoring, A2A coordination, failover)     │ │ │
│  │  └──────┬──────────────┬──────────────┬──────────────┬────────────────┘ │ │
│  │         │              │              │              │                   │ │
│  │  ┌──────▼──────┐ ┌─────▼──────┐ ┌────▼──────┐ ┌────▼──────────────┐   │ │
│  │  │Auditor_Agent│ │Governor_   │ │Green_     │ │Finance_Agent      │   │ │
│  │  │(anomaly     │ │Agent       │ │Architect_ │ │(ROI, SLA penalty, │   │ │
│  │  │ detection)  │ │(governance,│ │Agent      │ │ financial models) │   │ │
│  │  │             │ │ kill-switch│ │(carbon    │ │                   │   │ │
│  │  │             │ │ injection) │ │ scheduler)│ │                   │   │ │
│  │  └──────┬──────┘ └─────┬──────┘ └────┬──────┘ └────┬──────────────┘   │ │
│  └─────────┼──────────────┼─────────────┼─────────────┼───────────────────┘ │
│            │              │             │             │                       │
│  ┌─────────▼──────────────▼─────────────▼─────────────▼───────────────────┐  │
│  │                      Reasoning Engine                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │  │
│  │  │  Fast Tier   │  │ Medium Tier  │  │        Deep Tier             │  │  │
│  │  │  (≤500ms)    │  │  (5–15s)     │  │  (30–120s, dual chains,      │  │  │
│  │  │  GPT-4o-class│  │  Claude      │  │   contradiction detection,   │  │  │
│  │  │              │  │  Sonnet-class│  │   o3/Gemini 3.1 Pro-class)   │  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │  │
│  │  ┌──────────────────────────────────────────────────────────────────┐   │  │
│  │  │  Model Provider Abstraction Layer (pluggable interface)          │   │  │
│  │  └──────────────────────────────────────────────────────────────────┘   │  │
│  └─────────────────────────────────┬───────────────────────────────────────┘  │
│                                    │                                           │
│  ┌─────────────────────────────────▼───────────────────────────────────────┐  │
│  │                       Execution Engine                                  │  │
│  │  Digital Twin Simulation → Risk Scoring → Approval Routing → Execute   │  │
│  │  Agentic_Plan_Cache │ Rollback Manager │ Simulation Accuracy Tracker   │  │
│  └─────────────────────────────────┬───────────────────────────────────────┘  │
│                                    │                                           │
│  ┌─────────────────────────────────▼───────────────────────────────────────┐  │
│  │                    Supporting Systems                                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Liquid_Ledger│  │ ROI_Engine   │  │ Contract_    │  │ Protocol   │ │  │
│  │  │ (hash-chain) │  │              │  │ Digital_Twin │  │ Layer      │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘  │ MCP/A2A/  │ │  │
│  │                                                          │ AP2       │ │  │
│  │  ┌──────────────────────────────────────────────────┐   └────────────┘ │  │
│  │  │              Command_Center (UI)                 │                  │  │
│  │  │  Dashboard │ Agent Intelligence │ Action Pipeline│                  │  │
│  │  │  Agent Network View │ Governance Panel           │                  │  │
│  │  └──────────────────────────────────────────────────┘                  │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Event Flow: Ingestion → Reasoning → Execution → Ledger

```
Cloud API Poll (≤60s)
        │
        ▼
Kafka Topic: raw.billing.events
        │
        ▼
Auditor_Agent (anomaly detection, classification)
        │ cost-leakage event (≤10s after detection)
        ▼
Kafka Topic: events.cost_leakage
        │
        ▼
Agent_Orchestrator (routes to Reasoning_Engine)
        │
        ▼
Reasoning_Engine (composite signal routing)
   ├── Fast Tier  → recommendation (≤500ms)
   ├── Medium Tier → recommendation (5–15s)
   └── Deep Tier  → dual chains → contradiction check → recommendation (30–120s)
        │
        ▼
Execution_Engine
   ├── Digital Twin Simulation
   ├── Risk_Score + Confidence_Threshold assignment
   ├── Approval routing (auto / human review / blocked)
   └── Execute → outcome monitoring
        │
        ▼
Liquid_Ledger (every action, rollback, governance event)
        │
        ▼
ROI_Engine (outcome vs projection comparison, ≤24h)
```

### Microservices Breakdown

| Service | Responsibility | Scaling Unit |
|---|---|---|
| `ingestion-service` | Cloud API polling, normalization, Kafka publish | Per cloud provider |
| `auditor-agent` | Anomaly detection, classification | Per tenant |
| `governor-agent` | Kill-switch, DoW protection, injection detection | Per tenant |
| `green-architect-agent` | Carbon scheduling, CO₂e reporting | Per tenant |
| `finance-agent` | ROI, SLA penalty, financial modeling | Per tenant |
| `agent-orchestrator` | Event routing, health monitoring, A2A coordination | Horizontal |
| `reasoning-engine` | Tiered inference, model routing, hallucination detection | Horizontal |
| `execution-engine` | Simulation, risk scoring, execution, rollback | Horizontal |
| `protocol-layer` | MCP/A2A/AP2 message handling | Horizontal |
| `contract-twin-service` | SLA modeling, penalty calculation | Per tenant |
| `carbon-scheduler` | Carbon intensity ingestion, workload scheduling | Per tenant |
| `liquid-ledger` | Hash-chained audit log, tamper detection | Append-only cluster |
| `roi-engine` | ROI calculation, cost-per-correct-result | Per tenant |
| `command-center-api` | WebSocket/SSE gateway for UI | Horizontal |
| `command-center-ui` | React SPA, 5 views | CDN-served |
| `tenant-provisioner` | Tenant onboarding, namespace creation | On-demand |

---

## Components and Interfaces

### Data Ingestion Layer

#### Cloud Provider Connectors

Each connector is a polling adapter that normalizes provider-specific billing data into ECHO's canonical `BillingEvent` schema.

```
CloudConnector interface:
  poll() → List<RawBillingRecord>
  normalize(RawBillingRecord) → BillingEvent
  healthCheck() → ConnectorStatus

Implementations:
  AwsCostExplorerConnector   (AWS Cost Explorer API v2)
  AzureCostManagementConnector (Azure Cost Management REST API)
  GcpBillingConnector        (GCP Cloud Billing API v1)
```

Poll interval: configurable per tenant, maximum 60 seconds (Req 1.1).
Connectivity failure: if a connector fails to reach its API for >120 seconds, it emits a `ConnectivityFailureEvent` and continues polling available providers (Req 1.5).

#### Kafka Topic Schema

```
Topic: raw.billing.events
  Key:   tenant_id
  Value: BillingEvent {
    tenant_id:        string
    provider:         enum { AWS, AZURE, GCP }
    resource_id:      string
    resource_type:    string
    region:           string
    hourly_cost_usd:  decimal
    tags:             map<string, string>
    timestamp:        ISO-8601
    raw_payload:      bytes
  }

Topic: events.cost_leakage
  Key:   tenant_id
  Value: CostLeakageEvent {
    event_id:         uuid
    tenant_id:        string
    resource_id:      string
    anomaly_category: enum { IDLE, OVER_PROVISIONED, ORPHANED, USAGE_SPIKE }
    hourly_cost_usd:  decimal
    detection_ts:     ISO-8601
    emission_ts:      ISO-8601
    threshold_config: ThresholdConfig
  }

Topic: events.governance
Topic: events.carbon
Topic: events.financial
Topic: events.agent_health
Topic: events.ledger_writes
Topic: events.a2a_messages
```

#### Data Normalization Pipeline

```
RawBillingRecord
    │
    ▼
TagValidator (enforce required tenant tags)
    │
    ▼
CostNormalizer (convert to USD, apply exchange rates)
    │
    ▼
ResourceClassifier (map to canonical resource type taxonomy)
    │
    ▼
BillingEvent → Kafka: raw.billing.events
```

### Agent OS Layer

#### Agent_Orchestrator

The orchestrator is the central nervous system of the agent layer. It maintains a routing table, health registry, and A2A coordination bus.

```
AgentOrchestrator:
  routingTable: Map<EventType, AgentEndpoint>
  healthRegistry: Map<AgentId, AgentHealthStatus>
  a2aCoordinator: A2ACoordinator

  route(event: KafkaEvent) → void
    // dispatches to registered agent based on event type
    // falls back to standby if primary agent is unavailable

  coordinateA2A(request: A2ARequest) → A2AResponse
    // within 2 seconds (Req 5.2)

  healthCheck() → void
    // runs every ≤30 seconds (Req 5.3)
    // marks agent unavailable if no response within 30s
    // routes pending tasks to standby instance (Req 5.4)

  enforceIsolation(tenantId: string, agentId: AgentId) → bool
    // verifies agent is operating within its tenant boundary (Req 5.5)
```

Event routing table:

| Event Type | Primary Agent |
|---|---|
| `CostLeakageEvent` | Auditor_Agent |
| `GovernanceEvent` | Governor_Agent |
| `CarbonEvent` | Green_Architect_Agent |
| `FinancialModelingEvent` | Finance_Agent |
| `AP2TransactionRequest` | Governor_Agent (validation) → Finance_Agent |

#### Auditor_Agent

```
AuditorAgent:
  anomalyDetector: AnomalyDetector
  classifier: AnomalyClassifier
  thresholdConfig: TenantThresholdConfig

  processBillingEvent(event: BillingEvent) → Option<CostLeakageEvent>
    // detects anomaly, classifies, emits within 10s (Req 1.2)

  classify(anomaly: Anomaly) → AnomalyCategory
    // returns one of: IDLE | OVER_PROVISIONED | ORPHANED | USAGE_SPIKE (Req 1.4)
```

Anomaly detection algorithm: Z-score over a 7-day rolling window per resource type per tenant. Threshold breach triggers classification. Classification uses a decision tree:
- IDLE: resource active but zero utilization for >N hours
- OVER_PROVISIONED: utilization consistently <20% of provisioned capacity
- ORPHANED: resource has no associated active workload or owner tag
- USAGE_SPIKE: cost increase >X% vs rolling 24h average

#### Governor_Agent

```
GovernanceAgent:
  killSwitch: KillSwitchCircuitBreaker
  dowAccumulator: RollingSpendAccumulator
  injectionDetector: PromptInjectionDetector
  behaviorMonitor: BehaviorAnomalyMonitor
  confidenceManager: AgentConfidenceManager

  activateKillSwitch(tenantId, userId) → void
    // halts all agent actions within 5 seconds (Req 4.1)
    // logs to Liquid_Ledger (Req 4.2)

  checkDoWProtection(tenantId, spendDelta) → bool
    // checks rolling 24h accumulator (Req 4.4)
    // auto-activates kill-switch if limit exceeded

  validateAP2Transaction(tx: AP2Transaction) → ValidationResult
    // validates against tenant spending policies (Req 5.6)

  detectInjection(payload: AgentTaskPayload) → InjectionResult
    // detects malicious instructions in mathematical/logical structures (Req 13.6, 16.5)

  monitorBehavior(agentId, actionRate) → AnomalyResult
    // 3σ detection over 7-day rolling baseline (Req 13.1)

  isolateAgent(agentId) → void
    // suspends execution, revokes Execution_Engine access within 10s (Req 13.2)

  degradeConfidence(agentId, points: int) → void
    // reduces Confidence_Threshold by specified points (Req 14.3)
```

Kill-switch circuit breaker pattern:
```
State: CLOSED (normal) → OPEN (kill-switch active) → HALF-OPEN (manual reset)

CLOSED → OPEN: triggered by operator command OR DoW threshold breach
OPEN: all agent execution requests rejected immediately
OPEN → HALF-OPEN: requires manual re-enablement by Tenant Administrator
HALF-OPEN → CLOSED: after successful health verification
```

#### Green_Architect_Agent

```
GreenArchitectAgent:
  carbonIntensityFeed: CarbonIntensityFeed
  workloadScheduler: CarbonAwareScheduler
  savingsCalculator: CO2eSavingsCalculator

  ingestCarbonData() → void
    // polls Electricity Maps API every ≤15 minutes (Req 8.1)

  scheduleWorkload(workload: Workload) → ScheduleDecision
    // time-shifts if eligible and lower-carbon window available (Req 8.2)
    // enforces max deferral limit (Req 8.4)

  calculateSavings(workload: Workload, originalWindow, scheduledWindow) → CO2eSavings
    // returns kg CO₂e saved (Req 8.3)

  getMonthlySummary(tenantId, month) → CarbonSavingsSummary
    // aggregated by workload category and cloud region (Req 8.5)
```

#### Finance_Agent

```
FinanceAgent:
  roiEngine: ROIEngine
  contractTwin: ContractDigitalTwin
  financialSimulator: FinancialSimulator

  calculateROI(action: ExecutedAction) → ROIResult
  projectROI(proposedAction: ProposedAction) → ProjectedROI
  getPenaltyProjections(tenantId) → List<PenaltyProjection>
  runFinancialSimulation(scenario: Scenario) → SimulationResult
```

### Reasoning Engine Architecture

#### Three-Tier Routing Logic

```
ReasoningRouter:
  route(task: ReasoningTask) → ReasoningTier

  compositeSignal(task) → float:
    risk_weight     = 0.4
    financial_weight = 0.4
    tenant_weight   = 0.2
    return (task.risk_score * risk_weight)
         + (normalize(task.financial_impact) * financial_weight)
         + (tenant_config_factor(task.tenant_id) * tenant_weight)

  tier selection:
    composite < 0.30 AND financial_impact < $1,000  → FAST
    composite 0.30–0.60 OR financial_impact $1k–$50k → MEDIUM
    composite > 0.60 OR financial_impact > $50,000   → DEEP
```

Routing rules (Req 2.2, 2.3, 2.4):
- Fast: Risk_Score < 30 AND financial_impact < $1,000
- Medium: Risk_Score 30–60 OR financial_impact $1,000–$50,000
- Deep: Risk_Score > 60 OR financial_impact > $50,000

#### Model Provider Abstraction Layer

```
ModelProvider interface:
  infer(prompt: string, context: ModelContext) → InferenceResult
  getLatencyProfile() → LatencyProfile
  getCostPerToken() → decimal
  getContextWindowSize() → int
  getProviderMetrics() → ProviderMetrics

Implementations:
  OpenAIProvider      (o3-class for Deep, GPT-4o-class for Fast)
  GeminiProvider      (Gemini 3.1 Pro-class for Deep/large-context, Flash-class for Fast)
  AnthropicProvider   (Claude Sonnet-class for Medium)
  DeepSeekProvider    (R1-class for on-prem Deep)
  Llama4Provider      (Scout-class for on-prem large-context)
  CustomProvider      (generic HTTP endpoint for any OpenAI-compatible API)
```

Provider selection per tier (Req 17.1–17.4):
- Fast tier: GPT-4o-class, Gemini Flash-class (≤500ms, low cost)
- Medium tier: Claude Sonnet-class, Gemini Pro-class (5–15s, balanced)
- Deep tier: OpenAI o3-class, Gemini 3.1 Pro-class, DeepSeek-R1-class (30–120s, frontier)
- Large context (≥1M tokens): Gemini 3.1 Pro-class, Llama 4 Scout-class

#### Deep Mode: Dual Reasoning Chain Architecture

```
DeepModeProcessor:
  generateChain(prompt, context, seed_A) → ReasoningChain  // chain A
  generateChain(prompt, context, seed_B) → ReasoningChain  // chain B (independent)
  compareChains(chainA, chainB) → ComparisonResult
    // detects contradictions in conclusions
  
  process(task) → DeepModeResult:
    chainA = generateChain(task.prompt, task.context, random_seed())
    chainB = generateChain(task.prompt, task.context, random_seed())
    comparison = compareChains(chainA, chainB)
    if comparison.hasContradiction:
      return ReasoningConflict(chainA, chainB) → escalate to human review (Req 16.2)
    else:
      return mergedConclusion(chainA, chainB)
```

#### Hallucination Detection Pipeline

```
HallucinationDetector:
  validateClaims(output: ReasoningOutput, dataSources: List<DataSource>) → ValidationResult
    // for each factual claim in output:
    //   attempt verification against connected data sources (Req 16.3)
    //   if unverifiable: annotate with UNVERIFIED flag
    //                    reduce confidence by 20 points (Req 16.4)
    //   track structured_hallucination_rate per agent (Req 16.7)
```

#### Prompt Injection Sanitization

```
InjectionSanitizer:
  patterns: List<InjectionPattern>
    // mathematical payload injection patterns
    // logical structure injection patterns
    // role-override instruction patterns

  sanitize(payload: AgentTaskPayload) → SanitizationResult
    // scans for known injection patterns (Req 13.6, 16.5)
    // if detected: reject, log to Liquid_Ledger, notify admins (Req 16.6)
    // applies to all incoming agent task payloads before reasoning
```

#### Cost-Per-Correct-Result Tracking

```
CostTracker:
  sessionCost: decimal          // cumulative inference cost in USD (Req 2.7)
  correctResultCount: int
  totalResultCount: int

  costPerCorrectResult() → decimal:
    return totalReasoningCost / correctResultCount  (Req 2.9, 10.6)

  // "correct" = actual outcome matched projection within 15%
  // updated by ROI_Engine post-execution comparison (Req 14.1)
```

### Execution Engine

#### Digital Twin State Management

```
DigitalTwin:
  state: InfrastructureSnapshot    // current state of all tenant resources
  
  simulate(action: ProposedAction) → SimulationResult
    // applies action to a copy of current state
    // returns predicted outcome, cost delta, risk indicators
    // does NOT modify actual state

  updateState(actualOutcome: ExecutionOutcome) → void
    // updates twin with real execution results
    // feeds accuracy tracking
```

#### Risk Scoring Model

```
RiskScorer:
  score(action: ProposedAction, simulation: SimulationResult) → RiskScore

  formula:
    blast_radius_score  = f(affected_resource_count, resource_criticality)
    reversibility_score = f(action_type, rollback_complexity)
    confidence_score    = f(simulation_accuracy_history, data_freshness)
    financial_score     = f(estimated_cost_delta, tenant_budget_fraction)

    risk_score = weighted_sum(
      blast_radius_score  * 0.30,
      reversibility_score * 0.25,
      confidence_score    * 0.25,
      financial_score     * 0.20
    ) * 100  // normalized to 0–100
```

#### Approval Routing Workflow

```
ApprovalRouter:
  route(action: ScoredAction) → ApprovalDecision

  rules (evaluated in order):
    1. if action.risk_score > 70:
         → REQUIRE_HUMAN_APPROVAL (Req 3.3)
    2. if action.confidence_threshold < tenant.min_confidence:
         → QUEUE_FOR_HUMAN_REVIEW (Req 3.4)
    3. if roi_engine.projectROI(action) < 0:
         → FLAG_FOR_HUMAN_REVIEW (Req 10.8)
    4. if matches_cached_plan(action) AND action.risk_score < 30:
         → AUTO_EXECUTE_CACHED (Req 4.6)
    5. else:
         → AUTO_EXECUTE
```

#### Rollback Mechanism

```
RollbackManager:
  snapshots: Map<ActionId, ResourceSnapshot>

  captureSnapshot(resources: List<Resource>) → ResourceSnapshot
    // taken before every execution

  rollback(actionId: ActionId) → RollbackResult
    // restores resources to pre-action snapshot
    // must complete within 300 seconds (Req 3.6)
    // emits RollbackEvent to Liquid_Ledger
    // if fails within 300s: escalate to Governor_Agent (Req 3.8)
```

#### Agentic Plan Cache

```
AgenticPlanCache:
  store: PersistentKVStore  // 90-day TTL (Req 4.5)

  lookup(action: ProposedAction) → Option<CachedPlan>
    // key: hash(action_type, resource_id, parameters)
    // returns cached plan if parameters match exactly

  store(plan: ValidatedPlan) → void
    // stores with risk_score, simulation_results, approval_records

  invalidate(resourceId: string) → void
    // invalidates all cached plans for a resource when state changes
```

---

## Data Models

### Core Domain Models

```typescript
// Tenant configuration
interface Tenant {
  tenant_id: string                    // UUID
  name: string
  tier: TenantTier                     // STARTER | PROFESSIONAL | ENTERPRISE
  dow_protection_limit_usd: decimal    // rolling 24h spend limit
  min_confidence_threshold: number     // 0–100
  max_reasoning_budget_usd: decimal    // per session
  required_resource_tags: string[]
  notification_channels: NotificationChannel[]
  provisioned_at: ISO8601
  namespace: string                    // Kubernetes namespace
}

// Billing event (canonical form after normalization)
interface BillingEvent {
  event_id: string
  tenant_id: string
  provider: CloudProvider
  resource_id: string
  resource_type: string
  region: string
  hourly_cost_usd: decimal
  tags: Record<string, string>
  timestamp: ISO8601
}

// Cost leakage anomaly
interface CostLeakageEvent {
  event_id: string
  tenant_id: string
  resource_id: string
  anomaly_category: AnomalyCategory    // IDLE | OVER_PROVISIONED | ORPHANED | USAGE_SPIKE
  hourly_cost_usd: decimal
  detection_ts: ISO8601
  emission_ts: ISO8601
}

// Proposed action (output of Reasoning_Engine)
interface ProposedAction {
  action_id: string
  tenant_id: string
  action_type: ActionType
  target_resources: string[]
  parameters: Record<string, unknown>
  reasoning_session_id: string
  reasoning_tier: ReasoningTier        // FAST | MEDIUM | DEEP
  reasoning_cost_usd: decimal
  projected_savings_usd: decimal
  created_at: ISO8601
}

// Scored action (output of Execution_Engine pre-execution)
interface ScoredAction extends ProposedAction {
  risk_score: number                   // 0–100
  confidence_threshold: number         // 0–100
  simulation_result: SimulationResult
  projected_roi: decimal
  approval_state: ApprovalState        // PENDING | APPROVED | BLOCKED | QUEUED
}

// Execution outcome
interface ExecutionOutcome {
  action_id: string
  tenant_id: string
  executed_at: ISO8601
  actual_savings_usd: decimal
  simulation_deviation_pct: decimal
  rollback_triggered: boolean
  rollback_completed_at: ISO8601 | null
}

// Ledger entry
interface LedgerEntry {
  entry_id: string
  tenant_id: string
  entry_type: LedgerEntryType
  payload: Record<string, unknown>
  agent_id: string
  timestamp: ISO8601
  entry_hash: string                   // SHA-256 of (entry_id + payload + prev_hash)
  prev_hash: string                    // hash of previous entry in chain
  sequence_number: bigint
}

// Reasoning session
interface ReasoningSession {
  session_id: string
  tenant_id: string
  tier: ReasoningTier
  model_provider: string
  model_id: string
  prompt_tokens: number
  completion_tokens: number
  cost_usd: decimal
  latency_ms: number
  outcome_matched_projection: boolean | null  // set post-execution
  budget_exhausted: boolean
  completeness_pct: number | null
  created_at: ISO8601
}

// SLA contract
interface SLAContract {
  contract_id: string
  tenant_id: string
  vendor_name: string
  service_name: string
  terms: SLATerm[]
  penalty_schedule: PenaltySchedule
  effective_from: ISO8601
  effective_to: ISO8601
  ingested_at: ISO8601
}

interface SLATerm {
  metric_name: string
  threshold_value: decimal
  threshold_unit: string
  measurement_window: Duration
  breach_definition: string
}

// Carbon intensity data point
interface CarbonIntensityReading {
  region: string
  intensity_gco2_per_kwh: decimal
  forecast_horizon_hours: number
  source: string
  timestamp: ISO8601
}

// Workload scheduling record
interface WorkloadSchedule {
  workload_id: string
  tenant_id: string
  original_window: TimeWindow
  scheduled_window: TimeWindow
  max_deferral_deadline: ISO8601
  carbon_savings_kgco2e: decimal
  status: ScheduleStatus              // PENDING | EXECUTING | COMPLETED | DEFERRED_EXPIRED
}

// ROI calculation result
interface ROIResult {
  action_id: string
  tenant_id: string
  cost_savings_usd: decimal
  execution_cost_usd: decimal
  reasoning_cost_usd: decimal
  platform_cost_usd: decimal
  avoided_loss_usd: decimal
  net_roi_pct: decimal                // (savings - exec_cost - reasoning_cost) / platform_cost
  cost_per_correct_result: decimal
  calculated_at: ISO8601
}

// Agent health status
interface AgentHealthStatus {
  agent_id: string
  tenant_id: string
  status: AgentStatus                 // HEALTHY | DEGRADED | UNAVAILABLE | ISOLATED | SUSPENDED
  last_heartbeat: ISO8601
  action_rate_7d_baseline: decimal
  current_action_rate: decimal
  confidence_threshold: number        // 0–100, degraded by Governor on errors
  consecutive_errors_24h: number
  reasoning_accuracy_pct: decimal
  structured_hallucination_rate_pct: decimal
}
```

### Protocol Message Models

```typescript
// MCP context payload
interface MCPContextPayload {
  protocol_version: string
  session_id: string
  tenant_id: string
  context_tokens: number
  payload_bytes: number
  compressed: boolean
  streaming: boolean
  content: MCPContent | StreamReference
}

// A2A message
interface A2AMessage {
  message_id: string
  from_agent: string
  to_agent: string
  tenant_id: string
  task_type: string
  payload: Record<string, unknown>
  correlation_id: string
  timestamp: ISO8601
  signature: string                   // HMAC-SHA256 for trust verification
}

// AP2 transaction
interface AP2Transaction {
  transaction_id: string
  tenant_id: string
  initiating_agent: string
  transaction_type: AP2TransactionType
  amount_usd: decimal
  target_resource: string
  spending_mandate: SpendingMandate
  w3c_credential: W3CVerifiableCredential
  status: TransactionStatus
  created_at: ISO8601
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Anomaly Emission Latency

*For any* billing event that triggers an anomaly detection (spend exceeding tenant-configured threshold), the time elapsed between detection and emission of the `CostLeakageEvent` to the Kafka topic must be ≤ 10 seconds.

**Validates: Requirements 1.2**

---

### Property 2: Anomaly Classification Completeness

*For any* detected anomaly, the `anomaly_category` field in the emitted `CostLeakageEvent` must be exactly one of: `IDLE`, `OVER_PROVISIONED`, `ORPHANED`, or `USAGE_SPIKE`. No other values are valid.

**Validates: Requirements 1.4**

---

### Property 3: Cost Leakage Event Display Fields

*For any* `CostLeakageEvent` rendered in the Command_Center, the rendered output must contain the resource identifier, estimated hourly cost impact, and detection timestamp.

**Validates: Requirements 1.3**

---

### Property 4: Reasoning Tier Routing Correctness

*For any* incoming cost event, the routing decision must satisfy all of the following simultaneously:
- If `risk_score < 30` AND `financial_impact < $1,000` → routed to FAST tier
- If `risk_score` is in [30, 60] OR `financial_impact` is in [$1,000, $50,000] → routed to MEDIUM tier
- If `risk_score > 60` OR `financial_impact > $50,000` → routed to DEEP tier

No event may be routed to a tier that does not match its composite signal.

**Validates: Requirements 2.2, 2.3, 2.4, 2.5**

---

### Property 5: Reasoning Tier Latency Bounds

*For any* reasoning task processed by the engine, the response latency must fall within the bounds of its assigned tier:
- FAST tier: latency ≤ 500ms
- MEDIUM tier: latency in [5s, 15s]
- DEEP tier: latency in [30s, 120s]

**Validates: Requirements 2.1**

---

### Property 6: Cost-Per-Correct-Result Calculation Invariant

*For any* set of completed reasoning sessions where at least one session produced a correct result (actual outcome matched projection within 15%), the `cost_per_correct_result` metric must equal `sum(session_costs) / count(correct_sessions)`. The metric must never be negative.

**Validates: Requirements 2.9, 10.6**

---

### Property 7: Simulation Precedes Execution

*For any* proposed action that reaches the execution stage, a `SimulationResult` record with a matching `action_id` must exist in the system before the execution timestamp. No execution record may exist without a prior simulation record.

**Validates: Requirements 3.1**

---

### Property 8: Risk and Confidence Score Range Invariant

*For any* proposed action scored by the Execution_Engine, both `risk_score` and `confidence_threshold` must be integers in the closed interval [0, 100].

**Validates: Requirements 3.2**

---

### Property 9: High-Risk and Low-Confidence Approval Gating

*For any* proposed action where `risk_score > 70` OR `confidence_threshold < tenant.min_confidence`, the action must not be auto-executed. Its `approval_state` must be `REQUIRE_HUMAN_APPROVAL` or `QUEUED_FOR_REVIEW` before any execution record is created.

**Validates: Requirements 3.3, 3.4**

---

### Property 10: Rollback Trigger on Simulation Deviation

*For any* executed action where `simulation_deviation_pct > 20%`, a rollback must be initiated. The `rollback_triggered` field in the `ExecutionOutcome` must be `true`, and a `RollbackEvent` must exist in the Liquid_Ledger.

**Validates: Requirements 3.5**

---

### Property 11: Rollback Completion Latency

*For any* initiated rollback, the time from rollback initiation to resource restoration must be ≤ 300 seconds. If this deadline is not met, a `GovernanceEscalationEvent` must be emitted to the Governor_Agent.

**Validates: Requirements 3.6, 3.8**

---

### Property 12: Kill-Switch Activation Latency

*For any* kill-switch activation command issued from the Command_Center, all autonomous agent actions for the affected tenant must be halted within 5 seconds of the command being received.

**Validates: Requirements 4.1**

---

### Property 13: Kill-Switch Ledger Entry Completeness

*For any* kill-switch activation, the Liquid_Ledger must contain an entry with the activation event type, the activating user's identity, and the activation timestamp. All three fields must be present.

**Validates: Requirements 4.2**

---

### Property 14: Untagged Resource Execution Block

*For any* resource that does not carry all required tenant-defined tags, the Execution_Engine must not create an execution record targeting that resource. Tag validation must occur before execution.

**Validates: Requirements 4.3**

---

### Property 15: DoW Protection Auto-Kill

*For any* tenant where the rolling 24-hour autonomous spend accumulator exceeds the configured `dow_protection_limit_usd`, the kill-switch must be automatically activated. The accumulator must be monotonically increasing within the 24-hour window and reset at window boundary.

**Validates: Requirements 4.4**

---

### Property 16: Cached Plan Execution Without Re-Simulation

*For any* proposed action that exactly matches a cached plan (same action type, resource ID, and parameters) with `risk_score < 30`, the system must use the cached simulation result and must not create a new simulation record for that action.

**Validates: Requirements 4.6**

---

### Property 17: Agent Event Routing Correctness

*For any* event emitted to the Kafka bus, the Agent_Orchestrator must route it to the correct specialized agent: `CostLeakageEvent` → Auditor_Agent, `GovernanceEvent` → Governor_Agent, `CarbonEvent` → Green_Architect_Agent, `FinancialModelingEvent` → Finance_Agent.

**Validates: Requirements 5.1**

---

### Property 18: Tenant Isolation Invariant

*For any* two distinct tenants T1 and T2, no agent operating under T1's context may read, write, or reference any data record (billing event, ledger entry, action, agent state) that belongs to T2. This must hold at the storage, network, and agent execution layers.

**Validates: Requirements 5.5, 12.2**

---

### Property 19: AP2 Transaction Validation Ordering

*For any* AP2 transaction initiated by an agent, a `ValidationResult` record from the Governor_Agent must exist with a timestamp prior to the transaction's submission timestamp. No AP2 transaction may be submitted without prior validation.

**Validates: Requirements 5.6**

---

### Property 20: Protocol Message Round-Trip

*For any* valid MCP, A2A, or AP2 message `m`, parsing the raw bytes to produce `parsed_m`, then serializing `parsed_m` to bytes, then parsing again must produce a message object equivalent to `parsed_m`. Formally: `parse(serialize(parse(raw))) ≡ parse(raw)`.

**Validates: Requirements 6.6, 6.7**

---

### Property 21: Large Payload Compression Round-Trip

*For any* MCP context payload exceeding 128KB, compressing then decompressing must produce a byte-for-byte identical payload. Formally: `decompress(compress(payload)) ≡ payload`.

**Validates: Requirements 6.4**

---

### Property 22: Invalid Message Rejection

*For any* incoming protocol message that fails schema validation, the Protocol_Layer must reject it (no processing occurs), log the validation error with the raw payload, and return a structured error response. No partial processing of invalid messages is permitted.

**Validates: Requirements 6.8**

---

### Property 23: SLA Pre-Breach Warning Threshold

*For any* monitored service metric that reaches within 10% of its SLA threshold value, a `PreBreachWarningEvent` must be emitted. The warning must be emitted before the metric crosses the threshold, not after.

**Validates: Requirements 7.2**

---

### Property 24: SLA Breach Ledger Recording Latency

*For any* detected SLA breach, a ledger entry containing the breach event, affected contract identifier, breach duration, and estimated penalty must be written to the Liquid_Ledger within 60 seconds of breach detection.

**Validates: Requirements 7.4**

---

### Property 25: Carbon Scheduling Intensity Reduction

*For any* workload eligible for time-shifting that is rescheduled by the Carbon_Scheduler, the forecasted carbon intensity of the scheduled execution window must be at least 20% lower than the carbon intensity at the time the scheduling decision was made.

**Validates: Requirements 8.2**

---

### Property 26: Carbon Savings Non-Negativity

*For any* rescheduled workload, the calculated `carbon_savings_kgco2e` must be ≥ 0. A workload rescheduled to a lower-carbon window must never report negative savings.

**Validates: Requirements 8.3**

---

### Property 27: Deferral Deadline Enforcement

*For any* time-shifted workload with a configured `max_deferral_deadline`, the workload must execute no later than that deadline regardless of current carbon intensity. The `status` must transition to `EXECUTING` at or before the deadline.

**Validates: Requirements 8.4**

---

### Property 28: Monthly Carbon Savings Aggregation Invariant

*For any* tenant and calendar month, the monthly carbon savings summary value must equal the sum of `carbon_savings_kgco2e` across all `WorkloadSchedule` records for that tenant and month with `status = COMPLETED`.

**Validates: Requirements 8.5**

---

### Property 29: Ledger Entry Completeness

*For any* system event of type: agent action, governance event, kill-switch activation, rollback, SLA breach, or AP2 transaction — a corresponding `LedgerEntry` must exist in the Liquid_Ledger. No event of these types may occur without a ledger record.

**Validates: Requirements 9.1**

---

### Property 30: Hash Chain Integrity

*For any* sequence of ledger entries [e₁, e₂, ..., eₙ], each entry's `prev_hash` must equal the `entry_hash` of the immediately preceding entry. The `entry_hash` of each entry must equal `SHA-256(entry_id || payload || prev_hash)`. Any modification to a historical entry must cause hash verification to fail for all subsequent entries.

**Validates: Requirements 9.2**

---

### Property 31: Tamper Detection Alert

*For any* ledger entry where `SHA-256(entry_id || payload || prev_hash) ≠ stored entry_hash`, the integrity check must emit a `TamperDetectionAlert` to the Governor_Agent and the Tenant administrator. No tampered entry may pass integrity verification silently.

**Validates: Requirements 9.5**

---

### Property 32: Ledger Query Correctness

*For any* query against the Liquid_Ledger filtered by agent identifier, action type, resource identifier, or time range, the returned entries must be exactly the set of entries that match the filter predicate. No entries matching the filter may be omitted, and no entries not matching the filter may be included.

**Validates: Requirements 9.6**

---

### Property 33: Net ROI Formula Correctness

*For any* executed action with known `cost_savings_usd`, `execution_cost_usd`, `reasoning_cost_usd`, and `platform_cost_usd`, the computed `net_roi_pct` must equal `(cost_savings_usd - execution_cost_usd - reasoning_cost_usd) / platform_cost_usd * 100`. The formula must be applied consistently for all actions.

**Validates: Requirements 10.1**

---

### Property 34: Monthly ROI Aggregation Invariant

*For any* tenant and calendar month, the monthly ROI report value must equal the sum of individual `net_roi_pct` values for all completed actions in that month for that tenant.

**Validates: Requirements 10.2**

---

### Property 35: Avoided Loss as Positive ROI Component

*For any* ROI calculation, the `avoided_loss_usd` component (financial value of prevented incorrect decisions) must be included as a positive addend in the net ROI numerator. A non-zero avoided loss must always increase the net ROI value.

**Validates: Requirements 10.7**

---

### Property 36: Negative Projected ROI Flagging

*For any* proposed action where `projected_roi < 0`, the `approval_state` must be set to `FLAG_FOR_HUMAN_REVIEW` before any execution record is created. No action with negative projected ROI may be auto-executed.

**Validates: Requirements 10.8**

---

### Property 37: Agent Status Display Completeness

*For any* specialized agent rendered in the Agent Intelligence View, the rendered output must contain the agent's current status, last-action timestamp, and health indicator. All three fields must be present for every agent.

**Validates: Requirements 11.4**

---

### Property 38: Action Pipeline Display Completeness

*For any* action rendered in the Action Pipeline view, the rendered output must contain the action's `risk_score`, `confidence_threshold`, simulation status, and approval state. All four fields must be present.

**Validates: Requirements 11.5**

---

### Property 39: Session Timeout Enforcement

*For any* Command_Center user session that has been inactive for more than 30 minutes, the session must be terminated and subsequent requests must receive an authentication challenge. No request from an expired session may be processed.

**Validates: Requirements 11.8**

---

### Property 40: Tenant Provisioning Latency

*For any* new tenant provisioning request, the tenant environment must be fully operational (all agents running, Kafka topics created, namespace isolated) within 15 minutes of the provisioning request being submitted.

**Validates: Requirements 12.3**

---

### Property 41: Peak Load Latency

*For any* load scenario at or below 10,000 concurrent agent events per second across all tenants, the p99 event processing latency must be < 2 seconds.

**Validates: Requirements 12.5**

---

### Property 42: Usage Telemetry Completeness

*For any* tenant and any completed hour, a telemetry record must exist reporting compute consumption, reasoning API calls, and AP2 transaction volume for that hour. No hour may have a missing telemetry record for an active tenant.

**Validates: Requirements 12.6**

---

### Property 43: Behavioral Anomaly Detection

*For any* specialized agent whose action rate in a given measurement window exceeds 3 standard deviations above its 7-day rolling baseline, the Governor_Agent must flag the agent as a behavioral anomaly candidate. No agent exceeding the 3σ threshold may go undetected.

**Validates: Requirements 13.1**

---

### Property 44: Rogue Agent Isolation Latency

*For any* agent flagged as rogue by the Governor_Agent, the agent's execution must be suspended and its access to the Execution_Engine revoked within 10 seconds of detection.

**Validates: Requirements 13.2**

---

### Property 45: Containment Event Ledger Entry

*For any* agent isolation event, a `ContainmentEvent` ledger entry must be written to the Liquid_Ledger and a notification must be sent to configured Tenant administrators. Both must occur before the isolation is considered complete.

**Validates: Requirements 13.3**

---

### Property 46: Prompt Injection Detection and Blocking

*For any* agent task payload containing a known prompt injection pattern (malicious instructions embedded in mathematical or logical structures), the Governor_Agent must reject the payload, log the attempt to the Liquid_Ledger, and notify Tenant administrators. No injected payload may reach the Reasoning_Engine.

**Validates: Requirements 13.6, 16.5, 16.6**

---

### Property 47: Outcome vs Projection Comparison Timeliness

*For any* completed action, the ROI_Engine must perform an outcome vs projection comparison within 24 hours of the execution timestamp. No completed action may remain uncompared after 24 hours.

**Validates: Requirements 14.1**

---

### Property 48: Reasoning Error Flagging Threshold

*For any* completed action where `actual_savings_usd` is worse than `projected_savings_usd` by more than 15%, the action must be flagged as a `ReasoningErrorCandidate` and submitted to the Reasoning_Engine for post-mortem analysis.

**Validates: Requirements 14.2**

---

### Property 49: Confidence Threshold Degradation on Error

*For any* confirmed reasoning error, the responsible agent's `confidence_threshold` must be reduced by exactly 10 points. The reduction must be applied atomically and must not reduce the threshold below 0.

**Validates: Requirements 14.3**

---

### Property 50: Three-Strike Agent Suspension

*For any* agent that accumulates 3 consecutive confirmed reasoning errors within a 24-hour period, the agent must be suspended and its `status` set to `SUSPENDED`. The suspension must require manual re-enablement by a Tenant Administrator.

**Validates: Requirements 14.5**

---

### Property 51: RBAC Permission Enforcement

*For any* user action that falls outside the permissions of the user's assigned role, the action must be denied and an `UnauthorizedAttemptEvent` must be logged to the Liquid_Ledger. No out-of-role action may succeed.

**Validates: Requirements 15.2, 15.3**

---

### Property 52: API Key Scope Enforcement

*For any* API key, requests authenticated with that key must only be granted access to the key's scoped tenant and role. A key scoped to Tenant T1 must never grant access to Tenant T2's resources.

**Validates: Requirements 15.5**

---

### Property 53: API Key Usage Logging Completeness

*For any* API key usage event, the Liquid_Ledger must contain an entry with the key identifier, calling IP address, and requested operation. All three fields must be present.

**Validates: Requirements 15.6**

---

### Property 54: Deep Mode Dual Chain Generation

*For any* task processed in Deep Mode, the Reasoning_Engine must generate at least two independent reasoning chains before producing a recommendation. A Deep Mode output with fewer than two chains must not be committed.

**Validates: Requirements 16.1**

---

### Property 55: Reasoning Conflict Escalation

*For any* pair of independent reasoning chains that produce contradictory conclusions (as determined by the contradiction detector), the output must be flagged as a `ReasoningConflict` and routed to human review. No contradictory Deep Mode output may be auto-executed.

**Validates: Requirements 16.2**

---

### Property 56: Unverified Claim Confidence Reduction

*For any* reasoning output containing a factual claim that cannot be verified against connected data sources, the claim must be annotated with an `UNVERIFIED` flag and the recommendation's `confidence_threshold` must be reduced by exactly 20 points. The reduction must be applied per unverified claim.

**Validates: Requirements 16.4**

---

### Property 57: Model Routing by Task Type

*For any* reasoning task, the selected model provider must match the task's routing requirements:
- Financial anomaly detection tasks → fast inference model (≤500ms latency)
- High-complexity tasks with `risk_score > 60` → frontier deep reasoning model
- Large context tasks (requiring ≥1M token context) → model with ≥1M token context window

**Validates: Requirements 17.2, 17.3, 17.4**

---

### Property 58: Budget-Constrained Model Selection

*For any* reasoning session where the tenant has configured a `max_reasoning_cost_usd`, the selected model must be the lowest-cost model that meets the required reasoning depth for that session. A more expensive model must not be selected when a cheaper model satisfying the depth requirement exists.

**Validates: Requirements 17.5**

---

## Error Handling

### Connectivity Failures

| Failure | Detection | Response |
|---|---|---|
| Cloud provider API unreachable | Connector timeout after 30s | Retry with exponential backoff; emit `ConnectivityFailureAlert` after 120s (Req 1.5) |
| Carbon intensity feed unavailable | Feed timeout after 5 minutes | Fall back to last known data; emit `DataStalenessWarning` after 30 minutes (Req 8.6) |
| Reasoning model endpoint unreachable | HTTP timeout | Retry up to 3 times; fall back to next available provider in tier |
| Kafka broker unavailable | Producer/consumer exception | Circuit breaker opens; buffer events locally; alert ops team |

### Reasoning Failures

| Failure | Detection | Response |
|---|---|---|
| Budget exhaustion | Cost tracker exceeds `max_reasoning_budget_usd` | Terminate session; return partial result with `budget_exhausted=true` and `completeness_pct` (Req 2.10, 2.11) |
| Reasoning conflict (dual chains contradict) | Contradiction detector | Flag as `ReasoningConflict`; route to human review; do not auto-execute (Req 16.2) |
| Unverified factual claim | Claim validator | Annotate with `UNVERIFIED`; reduce confidence by 20 points (Req 16.4) |
| Three consecutive reasoning errors | ROI_Engine outcome comparison | Suspend agent; require manual re-enablement (Req 14.5) |

### Execution Failures

| Failure | Detection | Response |
|---|---|---|
| Simulation deviation > 20% | Outcome vs simulation comparison | Initiate rollback (Req 3.5) |
| Rollback timeout (>300s) | Rollback timer | Escalate to Governor_Agent for kill-switch evaluation (Req 3.8) |
| Untagged resource | Tag validator pre-execution | Block execution; return `TagValidationError` (Req 4.3) |
| Negative projected ROI | ROI_Engine pre-execution | Flag for human review; do not auto-execute (Req 10.8) |

### Governance Failures

| Failure | Detection | Response |
|---|---|---|
| DoW limit exceeded | Rolling accumulator | Auto-activate kill-switch; notify admins (Req 4.4) |
| Rogue agent detected (3σ) | Behavior monitor | Isolate within 10s; emit containment event; generate post-incident report (Req 13.2) |
| Governor_Agent unresponsive | Platform watchdog | Activate hardware-level kill-switch fallback within 30s (Req 13.5) |
| Prompt injection detected | Injection sanitizer | Reject payload; log to ledger; notify admins (Req 16.6) |

### Protocol Failures

| Failure | Detection | Response |
|---|---|---|
| Schema validation failure | Protocol_Layer validator | Reject message; log raw payload with error; return structured error response (Req 6.8) |
| Contract parse failure | Contract_Digital_Twin ingestion | Reject contract; return descriptive validation error; leave existing models unchanged (Req 7.6) |
| Ledger hash verification failure | Integrity check process | Emit `TamperDetectionAlert` to Governor_Agent and Tenant admin (Req 9.5) |

### Error Response Schema

All error responses from ECHO services follow a consistent structure:

```json
{
  "error_code": "SCHEMA_VALIDATION_FAILURE",
  "error_message": "Field 'risk_score' must be in range [0, 100], got 150",
  "request_id": "uuid",
  "tenant_id": "uuid",
  "timestamp": "ISO-8601",
  "details": {
    "field": "risk_score",
    "received_value": 150,
    "expected_range": [0, 100]
  }
}
```

---

## Testing Strategy

### Dual Testing Approach

ECHO uses both unit tests and property-based tests. They are complementary:
- Unit tests verify specific examples, integration points, and error conditions
- Property-based tests verify universal properties across thousands of generated inputs

Unit tests alone cannot provide confidence in a system with this many invariants across continuous numeric domains (risk scores, costs, latencies, carbon intensities). Property-based testing is essential.

### Property-Based Testing Library Selection

| Language | Library | Rationale |
|---|---|---|
| TypeScript/JavaScript | `fast-check` | Mature, excellent TypeScript support, shrinking |
| Python | `hypothesis` | Industry standard, rich strategy library |
| Go | `gopter` or `rapid` | Native Go, good shrinking support |
| Java/Kotlin | `jqwik` | JUnit 5 integration, powerful generators |

Each property test must run a minimum of **100 iterations** to provide meaningful coverage of the input space.

### Property Test Configuration

Each property test must be tagged with a comment referencing the design property it validates:

```typescript
// Feature: echo-autonomous-economic-os, Property 4: Reasoning Tier Routing Correctness
test.prop([fc.record({
  risk_score: fc.integer({ min: 0, max: 100 }),
  financial_impact: fc.float({ min: 0, max: 1_000_000 })
})])('routing assigns correct tier for all composite signals', ({ risk_score, financial_impact }) => {
  const tier = reasoningRouter.route({ risk_score, financial_impact });
  if (risk_score < 30 && financial_impact < 1000) {
    expect(tier).toBe(ReasoningTier.FAST);
  } else if (risk_score > 60 || financial_impact > 50000) {
    expect(tier).toBe(ReasoningTier.DEEP);
  } else {
    expect(tier).toBe(ReasoningTier.MEDIUM);
  }
});
```

### Property Test Coverage Map

| Property | Test Type | Component Under Test |
|---|---|---|
| P1: Anomaly emission latency | property | AuditorAgent |
| P2: Anomaly classification completeness | property | AnomalyClassifier |
| P3: Cost leakage display fields | property | CommandCenter renderer |
| P4: Reasoning tier routing correctness | property | ReasoningRouter |
| P5: Reasoning tier latency bounds | property | ReasoningEngine (integration) |
| P6: Cost-per-correct-result invariant | property | CostTracker |
| P7: Simulation precedes execution | property | ExecutionEngine |
| P8: Risk/confidence score range | property | RiskScorer |
| P9: High-risk approval gating | property | ApprovalRouter |
| P10: Rollback trigger on deviation | property | ExecutionEngine |
| P11: Rollback completion latency | property | RollbackManager |
| P12: Kill-switch latency | property | KillSwitchCircuitBreaker |
| P13: Kill-switch ledger completeness | property | GovernorAgent + LiquidLedger |
| P14: Untagged resource block | property | TagValidator |
| P15: DoW auto-kill | property | RollingSpendAccumulator |
| P16: Cached plan no re-simulation | property | AgenticPlanCache |
| P17: Agent event routing | property | AgentOrchestrator |
| P18: Tenant isolation | property | All data access layers |
| P19: AP2 validation ordering | property | GovernorAgent |
| P20: Protocol round-trip | property | ProtocolLayer (MCP/A2A/AP2) |
| P21: Compression round-trip | property | MCPCompressor |
| P22: Invalid message rejection | property | ProtocolLayer |
| P23: SLA pre-breach warning | property | ContractDigitalTwin |
| P24: SLA breach ledger latency | property | ContractDigitalTwin |
| P25: Carbon scheduling intensity | property | CarbonAwareScheduler |
| P26: Carbon savings non-negativity | property | CO2eSavingsCalculator |
| P27: Deferral deadline enforcement | property | CarbonAwareScheduler |
| P28: Monthly carbon aggregation | property | GreenArchitectAgent |
| P29: Ledger entry completeness | property | LiquidLedger |
| P30: Hash chain integrity | property | LiquidLedger |
| P31: Tamper detection alert | property | LiquidLedger integrity checker |
| P32: Ledger query correctness | property | LiquidLedger query engine |
| P33: Net ROI formula | property | ROIEngine |
| P34: Monthly ROI aggregation | property | ROIEngine |
| P35: Avoided loss positive component | property | ROIEngine |
| P36: Negative ROI flagging | property | ROIEngine + ApprovalRouter |
| P37: Agent status display fields | property | CommandCenter renderer |
| P38: Action pipeline display fields | property | CommandCenter renderer |
| P39: Session timeout | property | CommandCenter auth middleware |
| P40: Tenant provisioning latency | property | TenantProvisioner |
| P41: Peak load latency | property | System integration (load test) |
| P42: Usage telemetry completeness | property | TelemetryPipeline |
| P43: Behavioral anomaly detection | property | BehaviorAnomalyMonitor |
| P44: Rogue agent isolation latency | property | GovernorAgent |
| P45: Containment event ledger | property | GovernorAgent + LiquidLedger |
| P46: Prompt injection blocking | property | InjectionSanitizer |
| P47: Outcome comparison timeliness | property | ROIEngine |
| P48: Reasoning error flagging | property | ROIEngine |
| P49: Confidence degradation on error | property | GovernorAgent |
| P50: Three-strike suspension | property | GovernorAgent |
| P51: RBAC enforcement | property | AuthorizationMiddleware |
| P52: API key scope enforcement | property | APIKeyValidator |
| P53: API key usage logging | property | LiquidLedger |
| P54: Deep mode dual chains | property | DeepModeProcessor |
| P55: Reasoning conflict escalation | property | DeepModeProcessor |
| P56: Unverified claim confidence reduction | property | HallucinationDetector |
| P57: Model routing by task type | property | ModelProviderAbstraction |
| P58: Budget-constrained model selection | property | ModelProviderAbstraction |

### Unit Test Focus Areas

Unit tests should cover:
- Specific examples of anomaly classification (e.g., a resource with 0% CPU for 48h → IDLE)
- Integration points between agents (e.g., Finance_Agent consuming Contract_Digital_Twin projections)
- Error condition examples (e.g., malformed contract schema → descriptive error)
- Edge cases: empty billing history, zero-cost resources, contracts with no penalty schedule
- Specific routing examples for the kill-switch confirmation dialog
- Multi-cloud simultaneous monitoring (AWS + Azure + GCP in one tenant)
- Open-weight model deployment via custom provider endpoint

### Generator Design for Property Tests

Key generators needed:

```typescript
// Arbitrary billing event
fc.record({
  tenant_id: fc.uuid(),
  provider: fc.constantFrom('AWS', 'AZURE', 'GCP'),
  resource_id: fc.string({ minLength: 1 }),
  hourly_cost_usd: fc.float({ min: 0.001, max: 100000 }),
  tags: fc.dictionary(fc.string(), fc.string()),
  timestamp: fc.date().map(d => d.toISOString())
})

// Arbitrary proposed action with valid score ranges
fc.record({
  risk_score: fc.integer({ min: 0, max: 100 }),
  confidence_threshold: fc.integer({ min: 0, max: 100 }),
  projected_savings_usd: fc.float({ min: -10000, max: 1000000 }),
  reasoning_tier: fc.constantFrom('FAST', 'MEDIUM', 'DEEP')
})

// Arbitrary ledger entry sequence (for hash chain testing)
fc.array(fc.record({
  entry_id: fc.uuid(),
  payload: fc.jsonValue(),
  agent_id: fc.string()
}), { minLength: 2, maxLength: 100 })

// Arbitrary protocol message (for round-trip testing)
fc.oneof(
  arbitraryMCPMessage(),
  arbitraryA2AMessage(),
  arbitraryAP2Transaction()
)
```

### Integration and Load Testing

- **Integration tests**: Deploy all services in a test namespace; inject synthetic billing events; verify end-to-end flow from ingestion through ledger write
- **Load tests**: Use k6 or Gatling to simulate 10,000 events/sec; verify p99 < 2s (Property 41)
- **Chaos tests**: Kill individual agents; verify failover within 30s; verify no data loss in Liquid_Ledger
- **Security tests**: Inject known prompt injection payloads; verify all are blocked and logged (Property 46)
- **Tenant isolation tests**: Create two tenants; attempt cross-tenant data access; verify all attempts are blocked (Property 18)

---

## Governance and Security Architecture

### Kill-Switch Implementation

The kill-switch uses a circuit breaker pattern with three states. The ≤5 second guarantee is achieved by:
1. Kill-switch command is published to a dedicated high-priority Kafka topic (`governance.kill_switch`)
2. All agent execution loops subscribe to this topic with a dedicated consumer thread (not shared with normal event processing)
3. On receipt, agents immediately reject all pending execution requests and flush their work queues
4. Governor_Agent confirms halt by polling agent status endpoints; escalates if any agent does not confirm within 5s

```
KillSwitchCircuitBreaker:
  state: CLOSED | OPEN | HALF_OPEN
  activation_ts: ISO8601 | null
  activated_by: UserId | "SYSTEM_DOW" | "SYSTEM_WATCHDOG"

  activate(tenantId, userId) → void:
    state = OPEN
    activation_ts = now()
    publish(KillSwitchEvent, topic: governance.kill_switch, priority: CRITICAL)
    log_to_ledger(activation_event)
    // all execution requests now return KILL_SWITCH_ACTIVE immediately

  reset(tenantId, adminUserId) → void:
    state = HALF_OPEN
    // requires health verification before CLOSED
```

### DoW Protection

```
RollingSpendAccumulator:
  window_hours: 24
  buckets: Map<HourBucket, decimal>  // hourly spend buckets

  add(tenantId, amount_usd) → void:
    buckets[current_hour] += amount_usd
    if sum(last_24h_buckets) > tenant.dow_protection_limit_usd:
      governor.activateKillSwitch(tenantId, "SYSTEM_DOW")
      notify_admins(tenantId, DoWProtectionEvent)

  rollingSum() → decimal:
    return sum(buckets for hours in [now-24h, now])
```

### RBAC Model

| Role | Permissions |
|---|---|
| Read-Only Analyst | View all dashboards, export audit reports, no execution access |
| Operator | All Analyst permissions + approve/reject actions, view agent details |
| Finance Administrator | All Operator permissions + configure DoW limits, view ROI reports, manage SLA contracts |
| Platform Administrator | All Finance Admin permissions + manage tenants, configure RBAC, reset kill-switch, manage API keys |

Permission matrix for sensitive operations:

| Operation | Read-Only | Operator | Finance Admin | Platform Admin |
|---|---|---|---|---|
| Activate Kill-Switch | ✗ | ✓ | ✓ | ✓ |
| Reset Kill-Switch | ✗ | ✗ | ✗ | ✓ |
| Approve High-Risk Action | ✗ | ✓ | ✓ | ✓ |
| Configure DoW Limit | ✗ | ✗ | ✓ | ✓ |
| Manage Tenants | ✗ | ✗ | ✗ | ✓ |
| Export Audit Log | ✓ | ✓ | ✓ | ✓ |
| Reset Agent Confidence | ✗ | ✗ | ✓ | ✓ |

### Authentication Flow

```
User → Command_Center
  │
  ▼
SAML 2.0 / OIDC redirect to enterprise IdP
  │
  ▼
IdP authenticates user, returns assertion/token
  │
  ▼
Command_Center validates assertion/token
  │
  ▼
ECHO issues short-lived JWT (15 min) + refresh token (8h)
  │
  ▼
JWT contains: tenant_id, user_id, role, issued_at, expires_at
  │
  ▼
All API requests validated against JWT
Session terminated after 30 min inactivity (Req 11.8)
```

### Encryption

- Data at rest: AES-256-GCM for all database fields containing financial data, PII, and credentials (Req 15.4)
- Data in transit: TLS 1.3 minimum for all service-to-service and client-to-service communication (Req 15.4)
- API keys: stored as PBKDF2-hashed values; plaintext never persisted after initial generation
- Ledger entries: SHA-256 hash chaining (Req 9.2)
- Tenant namespace secrets: Kubernetes Secrets encrypted at rest via cloud KMS (AWS KMS / Azure Key Vault / GCP Cloud KMS)

---

## Protocol Layer Design

### MCP Implementation

```
MCPHandler:
  parse(rawBytes: bytes) → MCPContextPayload
  serialize(payload: MCPContextPayload) → bytes
  compress(payload: bytes) → bytes          // if payload > 128KB (Req 6.4)
  decompress(payload: bytes) → bytes
  stream(payload: MCPContextPayload) → AsyncIterator<MCPChunk>  // for payloads > 128KB (Req 6.5)

JSON-RPC schema:
{
  "jsonrpc": "2.0",
  "method": "context/submit",
  "id": "uuid",
  "params": {
    "session_id": "uuid",
    "tenant_id": "uuid",
    "context_tokens": 42000,
    "compressed": false,
    "streaming": false,
    "content": { ... }
  }
}
```

Streaming protocol for large payloads:
- Payloads > 128KB use chunked streaming via HTTP/2 server-sent events
- Each chunk carries a sequence number and checksum
- Receiver reassembles and verifies before processing

### A2A Implementation

```
A2AHandler:
  agentCard: AgentCard  // describes agent capabilities, endpoints, trust level
  
  send(message: A2AMessage) → void
  receive(rawMessage: bytes) → A2AMessage
  negotiate(remoteAgentCard: AgentCard) → TrustLevel
  delegate(task: AgentTask, targetAgent: AgentId) → TaskHandle

AgentCard schema:
{
  "agent_id": "uuid",
  "agent_type": "AUDITOR | GOVERNOR | GREEN_ARCHITECT | FINANCE",
  "tenant_id": "uuid",
  "capabilities": ["anomaly_detection", "cost_classification"],
  "endpoint": "https://...",
  "public_key": "base64-encoded",
  "trust_level": "INTERNAL | EXTERNAL"
}
```

Trust negotiation: all internal agents share a tenant-scoped trust anchor. External agents require explicit trust grant by Platform Administrator.

### AP2 Implementation

```
AP2Handler:
  wallet: AgentWallet
  
  initiateTransaction(tx: AP2Transaction) → TransactionHandle
  validateMandate(mandate: SpendingMandate) → ValidationResult
  verifyCredential(credential: W3CVerifiableCredential) → bool

SpendingMandate schema:
{
  "mandate_id": "uuid",
  "tenant_id": "uuid",
  "max_amount_usd": 500.00,
  "allowed_action_types": ["RESIZE", "TERMINATE_IDLE"],
  "valid_from": "ISO-8601",
  "valid_to": "ISO-8601",
  "requires_governor_approval": true
}
```

All AP2 transactions require Governor_Agent validation before submission (Req 5.6). Transactions exceeding the spending mandate are rejected with a `MandateExceededError`.

---

## Contract Digital Twin Engine

### Contract Ingestion Schema

```json
{
  "contract_id": "uuid",
  "vendor_name": "string",
  "service_name": "string",
  "terms": [
    {
      "metric_name": "api_availability_pct",
      "threshold_value": 99.9,
      "threshold_unit": "percent",
      "measurement_window": "P30D",
      "breach_definition": "monthly_average_below_threshold"
    }
  ],
  "penalty_schedule": {
    "tiers": [
      { "breach_severity": "MINOR", "penalty_pct_of_monthly_fee": 10 },
      { "breach_severity": "MAJOR", "penalty_pct_of_monthly_fee": 25 }
    ]
  }
}
```

### Digital Twin State Machine

```
ContractState:
  HEALTHY      → all metrics within threshold
  WARNING      → metric within 10% of threshold (emit PreBreachWarning) (Req 7.2)
  BREACHED     → metric crossed threshold (emit BreachEvent, log to ledger within 60s) (Req 7.4)
  REMEDIATED   → breach resolved

Transitions:
  HEALTHY → WARNING:   metric_value >= threshold * 0.90
  WARNING → BREACHED:  metric_value >= threshold
  BREACHED → REMEDIATED: metric_value < threshold for measurement_window
  REMEDIATED → HEALTHY: confirmed stable
```

### Penalty Calculation Engine

```
PenaltyCalculator:
  calculate(contract: SLAContract, breach: BreachEvent) → PenaltyEstimate:
    severity = classify_severity(breach.duration, breach.magnitude)
    tier = contract.penalty_schedule.tiers.find(t => t.breach_severity == severity)
    monthly_fee = contract.monthly_fee_usd
    return monthly_fee * (tier.penalty_pct_of_monthly_fee / 100)

  projectExposure(contract: SLAContract, currentMetrics: MetricSnapshot) → ProjectedPenalty:
    // runs every ≤5 minutes (Req 7.3)
    // projects penalty if current trend continues to end of measurement window
```

---

## Carbon-Aware Scheduler

### Carbon Intensity Data Ingestion

```
CarbonIntensityFeed:
  source: ElectricityMapsAPI  // or equivalent
  poll_interval: 15 minutes   // (Req 8.1)
  fallback_data: LastKnownIntensityCache

  ingest() → List<CarbonIntensityReading>
  getForecast(region, hours_ahead) → List<CarbonIntensityReading>
  isStale() → bool  // true if last successful poll > 30 minutes ago (Req 8.6)
```

### Time-Shifting Scheduling Algorithm

```
CarbonAwareScheduler:
  schedule(workload: Workload) → ScheduleDecision:
    if not workload.is_time_shiftable:
      return ScheduleDecision.EXECUTE_NOW

    current_intensity = feed.getCurrent(workload.region)
    forecast = feed.getForecast(workload.region, hours_ahead=24)
    
    // find windows with ≥20% lower intensity (Req 8.2)
    candidate_windows = forecast.filter(w =>
      w.intensity <= current_intensity * 0.80
      AND w.start <= workload.max_deferral_deadline  // (Req 8.4)
    )
    
    if candidate_windows.isEmpty():
      if now() >= workload.max_deferral_deadline:
        return ScheduleDecision.EXECUTE_NOW  // deadline enforcement
      else:
        return ScheduleDecision.DEFER(next_check_in=15_minutes)
    
    best_window = candidate_windows.min_by(intensity)
    savings = calculate_co2e_savings(workload, current_intensity, best_window.intensity)
    return ScheduleDecision.SCHEDULE(window=best_window, savings=savings)
```

---

## Liquid Ledger

### Hash-Chaining Algorithm

```
LiquidLedger:
  append(entry: LedgerEntryInput) → LedgerEntry:
    prev_entry = get_latest_entry(tenant_id)
    prev_hash = prev_entry?.entry_hash ?? GENESIS_HASH
    
    entry_hash = SHA-256(
      entry.entry_id
      + JSON.stringify(entry.payload)
      + prev_hash
    )
    
    ledger_entry = LedgerEntry {
      ...entry,
      entry_hash: entry_hash,
      prev_hash: prev_hash,
      sequence_number: prev_entry?.sequence_number + 1 ?? 0
    }
    
    persist(ledger_entry)
    return ledger_entry

  verifyIntegrity(tenantId, fromSeq, toSeq) → IntegrityResult:
    entries = query(tenantId, fromSeq, toSeq)
    for i in 1..entries.length:
      expected_hash = SHA-256(entries[i].entry_id + entries[i].payload + entries[i].prev_hash)
      if expected_hash != entries[i].entry_hash:
        emit TamperDetectionAlert(entries[i])  // (Req 9.5)
        return IntegrityResult.TAMPERED(entries[i])
    return IntegrityResult.VALID
```

### Storage Architecture

- Primary storage: Apache Cassandra or equivalent wide-column store (optimized for append-heavy, time-series workloads)
- Retention: 7-year TTL enforced at storage layer (Req 9.3)
- Partitioning: by `(tenant_id, year_month)` for efficient time-range queries
- Indexes: `(tenant_id, agent_id)`, `(tenant_id, action_type)`, `(tenant_id, resource_id)`, `(tenant_id, timestamp)`
- Cold storage: entries older than 90 days tiered to object storage (S3/Azure Blob/GCS) with index maintained in hot storage
- Audit export: streaming export pipeline; ≤30-day ranges complete within 60 seconds (Req 9.4)

---

## ROI Engine

### Net ROI Formula

```
ROIEngine:
  calculate(action: ExecutedAction) → ROIResult:
    net_roi_pct = (
      action.cost_savings_usd
      - action.execution_cost_usd
      - action.reasoning_cost_usd
      + action.avoided_loss_usd        // positive component (Req 10.7)
    ) / platform_cost_usd * 100        // (Req 10.1)

  costPerCorrectResult(tenantId, period) → decimal:
    sessions = reasoning_sessions.filter(tenant=tenantId, period=period)
    correct = sessions.filter(outcome_matched_projection=true)
    return sessions.sum(cost_usd) / correct.count()  // (Req 10.6)

  avoidedLoss(tenantId, period) → decimal:
    // sum of projected_savings for actions that were BLOCKED due to negative ROI
    // or actions that were flagged and corrected before execution
    blocked_actions = actions.filter(approval_state=BLOCKED, period=period)
    return blocked_actions.sum(abs(projected_negative_impact_usd))

  projectROI(proposedAction: ProposedAction) → ProjectedROI:
    // uses Finance_Agent simulation + Contract_Digital_Twin projections
    // + Carbon_Scheduler savings (Req 10.4)
    // provided to Execution_Engine before approval routing (Req 10.3)
```

---

## Command Center UI Architecture

### Frontend Technology Stack

- Framework: React 18 with TypeScript
- Real-time data: WebSocket connection to `command-center-api` for push updates (≤5s refresh, Req 11.2)
- State management: Zustand or Redux Toolkit
- Graph rendering (Agent Network View): D3.js or Cytoscape.js for live A2A communication graph
- YAML editor (Governance Panel): Monaco Editor
- Design system: custom dark-mode token system

### Component Hierarchy

```
App
├── AuthGuard (SAML/OIDC, session timeout enforcement)
├── Layout
│   ├── TopNav (tenant selector, user info, kill-switch quick-access)
│   └── SideNav (5 view links)
├── Views
│   ├── PrimaryDashboard
│   │   ├── ROISummaryCard (cumulative ROI, projected annual savings)
│   │   ├── CostLeakageStream (real-time anomaly feed)
│   │   ├── AgentStatusRow (health indicators for all 4 agents)
│   │   └── CarbonSavingsSummary
│   ├── AgentIntelligenceView
│   │   ├── AgentCard (status, last-action, health, confidence, hallucination rate)
│   │   ├── ReasoningAccuracyChart
│   │   └── ModelPerformanceTable (per-provider metrics)
│   ├── ActionPipeline
│   │   ├── ActionTable (risk_score, confidence, simulation status, approval state)
│   │   ├── ApprovalModal (for high-risk actions)
│   │   └── RollbackHistoryPanel
│   ├── AgentNetworkView
│   │   ├── A2AGraphRenderer (live D3 graph of inter-agent messages)
│   │   └── MessageInspector (click node to see A2A message details)
│   └── GovernancePanel
│       ├── KillSwitchButton (with confirmation dialog, Req 11.3)
│       ├── DoWProtectionConfig
│       ├── ResourceTaggingPolicy (YAML editor)
│       ├── RBACManager
│       └── ComplianceReportViewer
```

### Real-Time Data Pipeline

```
Kafka events
    │
    ▼
command-center-api (WebSocket server)
    │  subscribes to relevant Kafka topics
    │  filters by tenant_id from JWT
    │
    ▼
WebSocket connection (per authenticated session)
    │
    ▼
React state update → component re-render (≤5s, Req 11.2)
```

### Design System Tokens (Dark Mode)

```css
--color-background-primary: #0d1117
--color-background-secondary: #161b22
--color-surface: #21262d
--color-border: #30363d
--color-text-primary: #e6edf3
--color-text-secondary: #8b949e
--color-accent-blue: #58a6ff       /* normal operations */
--color-accent-green: #3fb950      /* savings, positive ROI */
--color-accent-yellow: #d29922     /* warnings, medium risk */
--color-accent-red: #f85149        /* kill-switch, high risk, errors */
--color-accent-orange: #db6d28     /* DoW warnings */
--color-accent-purple: #bc8cff     /* reasoning/AI activity */
```

---

## Multi-Tenant Architecture

### Tenant Isolation Model

```
Isolation Layer    │ Mechanism
───────────────────┼──────────────────────────────────────────────────
Kubernetes         │ Dedicated namespace per tenant
Network            │ NetworkPolicy: deny all cross-namespace traffic
Storage            │ Separate database schemas or separate DB instances
                   │ Row-level security on shared tables (tenant_id predicate)
Agent Execution    │ Agent processes scoped to tenant namespace
                   │ JWT tenant_id claim validated on every request
Kafka              │ Topic naming: {tenant_id}.{event_type}
                   │ ACLs restrict producers/consumers to tenant topics
Reasoning Engine   │ Session isolation: tenant_id in every prompt context
                   │ Model provider credentials scoped per tenant
```

### Provisioning Workflow (15-minute SLA)

```
TenantProvisioningWorkflow (target: ≤15 minutes, Req 12.3):

Step 1 (0–2 min):   Create Kubernetes namespace
                    Apply NetworkPolicy (deny cross-namespace)
                    Create namespace-scoped ServiceAccounts

Step 2 (2–5 min):   Provision database schema / tenant partition
                    Create Kafka topics with tenant prefix
                    Apply Kafka ACLs

Step 3 (5–10 min):  Deploy agent pods (Auditor, Governor, Green_Architect, Finance)
                    Deploy Execution_Engine instance
                    Configure tenant-specific settings

Step 4 (10–13 min): Initialize Liquid_Ledger partition
                    Create genesis ledger entry
                    Configure DoW protection limits

Step 5 (13–15 min): Health check all components
                    Emit TenantProvisionedEvent
                    Notify tenant administrator
```

### Horizontal Scaling Strategy

- Agent_Orchestrator: stateless; scale horizontally behind a load balancer; Kafka consumer group ensures each event processed once
- Execution_Engine: stateless for scoring; digital twin state stored in Redis cluster; scale horizontally
- Reasoning_Engine: stateless; scale based on queue depth in `reasoning.tasks` Kafka topic
- Liquid_Ledger: append-only; scale write throughput via Cassandra partition distribution
- command-center-api: stateless WebSocket server; sticky sessions via consistent hashing on tenant_id

---

## Deployment Architecture

### Kubernetes Structure

```
Helm chart: echo-platform/
├── Chart.yaml
├── values.yaml                    # default values
├── values-aws.yaml                # AWS-specific overrides
├── values-azure.yaml              # Azure-specific overrides
├── values-gcp.yaml                # GCP-specific overrides
└── templates/
    ├── namespaces/
    ├── deployments/
    │   ├── agent-orchestrator.yaml
    │   ├── reasoning-engine.yaml
    │   ├── execution-engine.yaml
    │   ├── ingestion-service.yaml
    │   ├── protocol-layer.yaml
    │   ├── liquid-ledger.yaml
    │   ├── roi-engine.yaml
    │   ├── command-center-api.yaml
    │   └── command-center-ui.yaml
    ├── services/
    ├── configmaps/
    ├── secrets/                   # references to cloud KMS
    ├── hpa/                       # HorizontalPodAutoscaler for each service
    ├── networkpolicies/
    └── rbac/
```

### Service Mesh

Istio service mesh for:
- mTLS between all services (enforces TLS 1.3, Req 15.4)
- Traffic policies and circuit breakers
- Distributed tracing (Jaeger integration)
- Canary deployments for reasoning engine model updates

### Observability Stack

```
Metrics:    Prometheus + Grafana
            Key metrics: event processing latency (p50/p95/p99), reasoning tier distribution,
            kill-switch activations, rollback rate, cost-per-correct-result, DoW accumulator

Tracing:    Jaeger (OpenTelemetry instrumentation)
            Trace: ingestion → anomaly detection → reasoning → execution → ledger

Logging:    Structured JSON logs → Fluentd → Elasticsearch/OpenSearch
            Log levels: ERROR, WARN, INFO, DEBUG
            All governance events at INFO minimum

Alerting:   AlertManager → PagerDuty / Slack
            Critical: kill-switch activation, tamper detection, Governor_Agent unresponsive
            Warning: DoW accumulator > 80% of limit, reasoning accuracy < 70%
```

### Multi-Cloud Deployment Strategy

Each cloud provider uses its managed Kubernetes service:
- AWS: EKS + RDS Aurora (PostgreSQL) + MSK (Kafka) + ElastiCache (Redis) + S3 (cold ledger)
- Azure: AKS + Azure Database for PostgreSQL + Event Hubs (Kafka-compatible) + Azure Cache for Redis + Azure Blob Storage
- GCP: GKE + Cloud SQL (PostgreSQL) + Pub/Sub (Kafka-compatible) + Memorystore (Redis) + GCS

Single Helm chart with cloud-specific values files handles provider differences.

### Disaster Recovery

- RPO (Recovery Point Objective): ≤5 minutes (Kafka replication + database replication)
- RTO (Recovery Time Objective): ≤30 minutes (automated failover via Kubernetes health checks)
- Liquid_Ledger: synchronous replication to secondary region; integrity verified on failover
- Cross-region active-passive for Liquid_Ledger (active-active would risk hash chain conflicts)
- Tenant data: daily snapshots to object storage with 7-year retention policy
