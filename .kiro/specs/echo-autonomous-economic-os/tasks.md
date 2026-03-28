# Implementation Plan: ECHO Autonomous Economic Operating System

## Overview

Incremental implementation of the ECHO platform, ordered by dependency: infrastructure first, then protocol layer, data ingestion, agent OS, the four specialized agent archetypes (Spend Intelligence, SLA Prevention, Resource Optimization, Financial Ops), governance, reasoning, green scheduling, audit ledger, security, UI, multi-tenancy, and deployment. Each task builds on the previous and ends with all components wired together.

## Tasks

- [x] 1. Set up Kafka event bus and topic schema
  - Create Kafka cluster configuration (3 brokers, replication factor 3)
  - Define and register all Avro/JSON schemas for: `BillingEvent`, `CostLeakageEvent`, `GovernanceEvent`, `CarbonEvent`, `FinancialModelingEvent`, `AgentHealthEvent`, `LedgerWriteEvent`, `A2AMessage`
  - Create topics: `raw.billing.events`, `events.cost_leakage`, `events.governance`, `events.carbon`, `events.financial`, `events.agent_health`, `events.ledger_writes`, `events.a2a_messages`, `governance.kill_switch` (high-priority, dedicated)
  - Configure per-tenant topic naming convention: `{tenant_id}.{event_type}`
  - Configure Kafka ACLs to restrict producers/consumers to their tenant-scoped topics
  - _Requirements: 1.1, 1.2, 4.1, 5.1, 5.5, 12.2_

- [x] 2. Implement PostgreSQL multi-tenant schema with row-level security
  - Create per-tenant database schemas with `tenant_id` partition key on all shared tables
  - Implement row-level security (RLS) policies enforcing `tenant_id` predicate on every SELECT, INSERT, UPDATE, DELETE
  - Create tables: `tenants`, `billing_events`, `proposed_actions`, `scored_actions`, `execution_outcomes`, `reasoning_sessions`, `agent_health_status`, `sla_contracts`, `workload_schedules`, `roi_results`
  - Add indexes: `(tenant_id, timestamp)`, `(tenant_id, resource_id)`, `(tenant_id, agent_id)`
  - Write migration scripts using a versioned migration tool (e.g., Flyway or node-pg-migrate)
  - _Requirements: 5.5, 12.2_

- [x] 3. Set up Cassandra cluster for Liquid Ledger storage
  - Create Cassandra keyspace with replication factor 3 (multi-AZ)
  - Define `ledger_entries` table partitioned by `(tenant_id, year_month)` with clustering on `sequence_number`
  - Create secondary indexes: `(tenant_id, agent_id)`, `(tenant_id, action_type)`, `(tenant_id, resource_id)`, `(tenant_id, timestamp)`
  - Configure 7-year TTL at the storage layer
  - Configure cold-tier archival: entries older than 90 days tiered to object storage (S3/Azure Blob/GCS) with hot-storage index retained
  - _Requirements: 9.1, 9.3, 9.6_

- [x] 4. Set up Redis cluster for digital twin state and caching
  - Deploy Redis cluster (3 primary + 3 replica nodes)
  - Configure keyspace for digital twin state: `twin:{tenant_id}:{resource_id}` → `InfrastructureSnapshot`
  - Configure keyspace for Agentic Plan Cache: `plan_cache:{tenant_id}:{action_hash}` → `CachedPlan` with 90-day TTL
  - Configure keyspace for DoW rolling accumulator: `dow:{tenant_id}:{hour_bucket}` → spend amount
  - Configure keyspace for agent health registry: `health:{tenant_id}:{agent_id}` → `AgentHealthStatus`
  - _Requirements: 3.1, 4.5, 4.6, 4.4_

- [x] 5. Implement Kubernetes namespace-per-tenant provisioning framework
  - Write `TenantProvisioningWorkflow` service with 5-step workflow (target ≤15 min per Req 12.3)
  - Step 1: Create Kubernetes namespace, apply `NetworkPolicy` (deny all cross-namespace traffic), create namespace-scoped `ServiceAccount`s
  - Step 2: Provision PostgreSQL schema partition, create Kafka topics with tenant prefix, apply Kafka ACLs
  - Step 3: Deploy agent pods (Auditor, Governor, Green_Architect, Finance) and Execution_Engine instance with tenant config
  - Step 4: Initialize Liquid_Ledger partition, write genesis ledger entry, configure DoW protection limits
  - Step 5: Health-check all components, emit `TenantProvisionedEvent`, notify tenant administrator
  - _Requirements: 12.2, 12.3_

- [ ]* 5.1 Write property test for tenant provisioning latency
  - **Property 40: Tenant Provisioning Latency**
  - **Validates: Requirements 12.3**

- [ ] 6. Configure Istio service mesh with mTLS
  - Install Istio with `PeerAuthentication` policy set to `STRICT` mTLS for all namespaces
  - Configure `DestinationRule` resources enforcing TLS 1.3 minimum for all service-to-service traffic
  - Set up traffic policies and circuit breakers for Reasoning_Engine model provider calls
  - Configure Jaeger integration for distributed tracing (OpenTelemetry instrumentation on all services)
  - _Requirements: 15.4_

- [ ] 7. Deploy observability stack (Prometheus, Grafana, Jaeger, AlertManager)
  - Deploy Prometheus with scrape configs for all ECHO services
  - Create Grafana dashboards: event processing latency (p50/p95/p99), reasoning tier distribution, kill-switch activations, rollback rate, cost-per-correct-result, DoW accumulator
  - Configure Jaeger for end-to-end trace: ingestion → anomaly detection → reasoning → execution → ledger
  - Configure AlertManager rules: kill-switch activation (critical), tamper detection (critical), Governor_Agent unresponsive (critical), DoW accumulator >80% (warning), reasoning accuracy <70% (warning)
  - _Requirements: 12.4, 12.5_

- [ ] 8. Checkpoint — Foundation infrastructure complete
  - Verify Kafka topics are created and ACLs enforced
  - Verify PostgreSQL RLS blocks cross-tenant queries
  - Verify Cassandra keyspace and TTL configuration
  - Verify Redis cluster connectivity and key expiry
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement MCP protocol handler
  - Implement `MCPHandler` with `parse()`, `serialize()`, `compress()`, `decompress()`, and `stream()` methods
  - Implement JSON-RPC 2.0 schema for `context/submit` method
  - Implement payload compression (zstd or gzip) triggered when payload exceeds 128KB
  - Implement chunked HTTP/2 SSE streaming for payloads >128KB with sequence numbers and per-chunk checksums
  - Implement schema validation: reject invalid messages, log raw payload with error, return structured error response
  - Support context payloads up to 1 million tokens
  - _Requirements: 6.1, 6.4, 6.5, 6.6, 6.8_

- [ ]* 9.1 Write property test for MCP round-trip
  - **Property 20: Protocol Message Round-Trip** — `parse(serialize(parse(raw))) ≡ parse(raw)` for all valid MCP messages
  - **Validates: Requirements 6.6, 6.7**

- [ ]* 9.2 Write property test for MCP compression round-trip
  - **Property 21: Large Payload Compression Round-Trip** — `decompress(compress(payload)) ≡ payload` for all payloads >128KB
  - **Validates: Requirements 6.4**

- [ ]* 9.3 Write property test for invalid MCP message rejection
  - **Property 22: Invalid Message Rejection** — any message failing schema validation must be rejected with no partial processing
  - **Validates: Requirements 6.8**

- [x] 10. Implement A2A protocol handler
  - Implement `A2AHandler` with `send()`, `receive()`, `negotiate()`, and `delegate()` methods
  - Implement `AgentCard` schema and trust negotiation (internal agents share tenant-scoped trust anchor; external agents require explicit Platform Administrator grant)
  - Implement HMAC-SHA256 message signing and verification on all A2A messages
  - Implement `A2ACoordinator` in Agent_Orchestrator for inter-agent request coordination within 2 seconds
  - _Requirements: 6.2, 5.2_

- [ ]* 10.1 Write property test for A2A round-trip
  - **Property 20: Protocol Message Round-Trip** — `parse(serialize(parse(raw))) ≡ parse(raw)` for all valid A2A messages
  - **Validates: Requirements 6.6, 6.7**

- [x] 11. Implement AP2 protocol handler
  - Implement `AP2Handler` with `initiateTransaction()`, `validateMandate()`, and `verifyCredential()` methods
  - Implement `AgentWallet` and `SpendingMandate` schema with `max_amount_usd`, `allowed_action_types`, validity window, and `requires_governor_approval` flag
  - Implement W3C Verifiable Credential verification
  - Reject transactions exceeding spending mandate with `MandateExceededError`
  - _Requirements: 6.3, 5.6_

- [ ]* 11.1 Write property test for AP2 round-trip
  - **Property 20: Protocol Message Round-Trip** — `parse(serialize(parse(raw))) ≡ parse(raw)` for all valid AP2 messages
  - **Validates: Requirements 6.6, 6.7**

- [ ]* 11.2 Write property test for AP2 transaction validation ordering
  - **Property 19: AP2 Transaction Validation Ordering** — Governor_Agent `ValidationResult` timestamp must precede transaction submission timestamp for every AP2 transaction
  - **Validates: Requirements 5.6**

- [x] 12. Implement AWS Cost Explorer connector
  - Implement `AwsCostExplorerConnector` with `poll()`, `normalize()`, and `healthCheck()` methods
  - Poll AWS Cost Explorer API v2 at configurable interval (max 60 seconds per Req 1.1)
  - Normalize raw AWS billing records to canonical `BillingEvent` schema (USD conversion, resource type taxonomy mapping)
  - Implement `TagValidator` to enforce required tenant tags before publishing to Kafka
  - Emit `ConnectivityFailureEvent` if API unreachable for >120 seconds; continue polling available providers
  - Publish normalized `BillingEvent` to `raw.billing.events` Kafka topic
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 13. Implement Azure Cost Management connector
  - Implement `AzureCostManagementConnector` with `poll()`, `normalize()`, and `healthCheck()` methods
  - Poll Azure Cost Management REST API at configurable interval (max 60 seconds)
  - Normalize to canonical `BillingEvent` schema with Azure-specific resource type mapping
  - Reuse `TagValidator` and `ConnectivityFailureEvent` logic from task 12
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 14. Implement GCP Billing API connector
  - Implement `GcpBillingConnector` with `poll()`, `normalize()`, and `healthCheck()` methods
  - Poll GCP Cloud Billing API v1 at configurable interval (max 60 seconds)
  - Normalize to canonical `BillingEvent` schema with GCP-specific resource type mapping
  - Reuse `TagValidator` and `ConnectivityFailureEvent` logic from task 12
  - _Requirements: 1.1, 1.5, 1.6_

- [x] 15. Implement Carbon Intensity API connector
  - Implement `CarbonIntensityFeed` polling Electricity Maps API (or equivalent) every ≤15 minutes
  - Store `CarbonIntensityReading` records (region, intensity_gco2_per_kwh, forecast_horizon_hours, timestamp)
  - Implement `LastKnownIntensityCache` fallback: if feed unavailable >30 minutes, use last known data and emit `DataStalenessWarning`
  - Implement `isStale()` check and `getForecast(region, hours_ahead)` method
  - _Requirements: 8.1, 8.6_

- [x] 16. Implement Kafka ingestion pipeline with normalization
  - Implement `DataNormalizationPipeline`: `RawBillingRecord` → `TagValidator` → `CostNormalizer` (USD, exchange rates) → `ResourceClassifier` (canonical taxonomy) → `BillingEvent`
  - Wire all three cloud connectors (AWS, Azure, GCP) through the pipeline
  - Implement Kafka producer with idempotent writes and `tenant_id` as partition key
  - Implement dead-letter queue for records failing normalization
  - _Requirements: 1.1, 1.6_

- [ ] 17. Checkpoint — Data ingestion layer complete
  - Verify all three cloud connectors publish normalized `BillingEvent`s to Kafka
  - Verify `ConnectivityFailureEvent` is emitted after 120s of API unavailability
  - Verify tag validation blocks untagged resources
  - Ensure all tests pass, ask the user if questions arise.

- [x] 18. Implement Agent_Orchestrator
  - Implement `AgentOrchestrator` with `routingTable`, `healthRegistry`, and `a2aCoordinator`
  - Implement `route(event)`: dispatch to registered agent by event type; fall back to standby if primary unavailable
  - Implement event routing table: `CostLeakageEvent` → Auditor_Agent, `GovernanceEvent` → Governor_Agent, `CarbonEvent` → Green_Architect_Agent, `FinancialModelingEvent` → Finance_Agent, `AP2TransactionRequest` → Governor_Agent then Finance_Agent
  - Implement `healthCheck()`: poll all agents every ≤30 seconds; mark unavailable if no response within 30s; route pending tasks to standby instance
  - Implement `coordinateA2A(request)`: coordinate inter-agent requests within 2 seconds
  - Implement `enforceIsolation(tenantId, agentId)`: verify agent operates within its tenant boundary
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 18.1 Write property test for agent event routing correctness
  - **Property 17: Agent Event Routing Correctness** — every event type routes to exactly the correct specialized agent
  - **Validates: Requirements 5.1**

- [ ]* 18.2 Write property test for tenant isolation invariant
  - **Property 18: Tenant Isolation Invariant** — no agent operating under T1 context may read, write, or reference any data belonging to T2
  - **Validates: Requirements 5.5, 12.2**

- [ ] 19. Implement tenant isolation enforcement at agent execution layer
  - Implement JWT `tenant_id` claim validation middleware applied to every agent request handler
  - Implement Kafka consumer group isolation: each agent consumer group scoped to tenant-prefixed topics only
  - Implement PostgreSQL connection pool with RLS context set to `tenant_id` on every connection
  - Implement Redis key namespace enforcement: all agent reads/writes prefixed with `{tenant_id}:`
  - Write integration test: two tenants, cross-tenant data access attempt, verify all attempts blocked
  - _Requirements: 5.5, 12.2_

- [x] 20. Implement Auditor_Agent anomaly detection engine (Spend Intelligence)
  - Implement `AnomalyDetector` using Z-score over a 7-day rolling window per resource type per tenant
  - Compute rolling mean and standard deviation from `BillingEvent` history stored in PostgreSQL
  - Trigger anomaly when spend exceeds tenant-configured threshold (Z-score breach)
  - Emit `CostLeakageEvent` to `events.cost_leakage` Kafka topic within 10 seconds of detection
  - Include in event: `resource_id`, `hourly_cost_usd`, `detection_ts`, `emission_ts`, `threshold_config`
  - _Requirements: 1.1, 1.2_

- [ ]* 20.1 Write property test for anomaly emission latency
  - **Property 1: Anomaly Emission Latency** — time from detection to `CostLeakageEvent` emission must be ≤10 seconds for all triggering billing events
  - **Validates: Requirements 1.2**

- [x] 21. Implement anomaly classifier (Spend Intelligence)
  - Implement `AnomalyClassifier` decision tree producing exactly one of: `IDLE`, `OVER_PROVISIONED`, `ORPHANED`, `USAGE_SPIKE`
  - IDLE: resource active but zero utilization for >N hours (N = tenant-configured)
  - OVER_PROVISIONED: utilization consistently <20% of provisioned capacity
  - ORPHANED: resource has no associated active workload or owner tag
  - USAGE_SPIKE: cost increase >X% vs rolling 24h average (X = tenant-configured)
  - Set `anomaly_category` field on `CostLeakageEvent` before emission
  - _Requirements: 1.4_

- [ ]* 21.1 Write property test for anomaly classification completeness
  - **Property 2: Anomaly Classification Completeness** — `anomaly_category` must be exactly one of the four valid enum values for every detected anomaly; no other values permitted
  - **Validates: Requirements 1.4**

- [x] 22. Implement procurement and vendor data ingestion for Spend Intelligence
  - Extend `AuditorAgent` to ingest procurement and vendor spend data (CSV/API import)
  - Implement duplicate cost detection: identify same vendor charge appearing in multiple billing records within a configurable time window
  - Implement rate optimization detection: compare current vendor rates against historical rates and market benchmarks
  - Publish detected duplicate costs and rate optimization opportunities as `CostLeakageEvent`s with `anomaly_category = OVER_PROVISIONED` or `ORPHANED`
  - _Requirements: 1.1, 1.4_

- [x] 23. Implement actionable playbook generator (Spend Intelligence)
  - Implement `PlaybookGenerator` that converts a `CostLeakageEvent` into a structured remediation playbook
  - Playbook schema: `{ playbook_id, tenant_id, anomaly_ref, recommended_actions[], cost_impact_math, estimated_savings_usd, confidence_score, created_at }`
  - Each recommended action includes: action type, target resource, parameters, and inline cost impact formula
  - Publish playbook to `events.financial` Kafka topic for Finance_Agent ROI evaluation
  - _Requirements: 1.2, 1.3_

- [x] 24. Implement cost impact quantification for Spend Intelligence
  - Implement `CostImpactCalculator` with formula: `savings = (current_hourly_cost - optimized_hourly_cost) * hours_per_month`
  - Attach `cost_impact_math` object to every playbook: `{ current_hourly_cost, optimized_hourly_cost, hours_per_month, projected_monthly_savings_usd, formula_string }`
  - Expose `projected_monthly_savings_usd` as a required field on all `CostLeakageEvent`s and playbooks
  - Wire `CostImpactCalculator` output into `ProposedAction.projected_savings_usd`
  - _Requirements: 1.2, 1.3, 10.1_

- [ ] 25. Implement downstream workflow trigger for approved playbooks (Spend Intelligence)
  - Implement AP2 transaction initiation for playbooks approved via the Action Pipeline
  - On approval: create `AP2Transaction` with `spending_mandate` scoped to the playbook's recommended actions
  - Submit to `AP2Handler.initiateTransaction()` after Governor_Agent validation
  - Record AP2 transaction initiation in Liquid_Ledger
  - _Requirements: 5.6, 6.3_

- [ ]* 25.1 Write unit tests for Spend Intelligence agent end-to-end
  - Test: billing event with 0% CPU for 48h → classified as IDLE → playbook generated with savings math → AP2 transaction initiated on approval
  - Test: duplicate vendor charge detected → ORPHANED classification → playbook with deduplication action
  - Test: rate optimization opportunity → OVER_PROVISIONED → playbook with rate renegotiation action
  - _Requirements: 1.1, 1.2, 1.4_

- [ ] 26. Checkpoint — Spend Intelligence Agent complete
  - Verify anomaly detection emits within 10s
  - Verify all four anomaly categories are classified correctly
  - Verify playbooks include cost impact math (`savings = (current - optimized) * hours`)
  - Ensure all tests pass, ask the user if questions arise.

- [x] 27. Implement Contract Digital Twin ingestion and state machine (SLA Prevention)
  - Implement `ContractDigitalTwin` service with `ingestContract(contractJson)` method
  - Parse SLA contract JSON schema: `contract_id`, `vendor_name`, `service_name`, `terms[]`, `penalty_schedule`
  - Validate contract schema on ingestion; reject with descriptive error and leave existing models unchanged on parse failure
  - Implement state machine: `HEALTHY → WARNING → BREACHED → REMEDIATED → HEALTHY`
  - Transition `HEALTHY → WARNING` when `metric_value >= threshold * 0.90` (within 10% of threshold)
  - Transition `WARNING → BREACHED` when `metric_value >= threshold`
  - Store contract state in PostgreSQL with `tenant_id` isolation
  - _Requirements: 7.1, 7.6_

- [ ] 28. Implement SLA threshold monitoring loop (SLA Prevention)
  - Implement monitoring loop that evaluates all active SLA contracts every ≤5 minutes
  - For each contract term, fetch current metric value from connected data sources
  - Compute `projected_penalty_usd` using `PenaltyCalculator.projectExposure()` at each evaluation cycle
  - Publish `ProjectedPenaltyEvent` to `events.financial` Kafka topic for Finance_Agent consumption
  - _Requirements: 7.3_

- [ ] 29. Implement pre-breach detection and warning emission (SLA Prevention)
  - Implement `PreBreachWarningEvent` emission when metric enters WARNING state (within 10% of threshold)
  - Emit warning to both `events.financial` (Finance_Agent) and `events.governance` (Command_Center)
  - Warning must be emitted before the metric crosses the threshold (not after)
  - Include in warning: `contract_id`, `metric_name`, `current_value`, `threshold_value`, `proximity_pct`, `projected_breach_time`
  - _Requirements: 7.2_

- [ ]* 29.1 Write property test for SLA pre-breach warning threshold
  - **Property 23: SLA Pre-Breach Warning Threshold** — `PreBreachWarningEvent` must be emitted for any metric reaching within 10% of its SLA threshold, before the threshold is crossed
  - **Validates: Requirements 7.2**

- [ ] 30. Implement penalty calculation engine with financial exposure math (SLA Prevention)
  - Implement `PenaltyCalculator.calculate(contract, breach)`: `penalty = monthly_fee * (penalty_pct / 100)`
  - Classify breach severity (MINOR/MAJOR) based on breach duration and magnitude
  - Look up penalty tier from `penalty_schedule` by severity
  - Attach `penalty_math` object: `{ monthly_fee_usd, penalty_pct, severity, formula_string, estimated_penalty_usd }`
  - Expose `estimated_penalty_usd` as a required field on all breach and pre-breach events
  - _Requirements: 7.3, 7.5_

- [ ] 31. Implement automated remediation actions for SLA breach prevention (SLA Prevention)
  - Implement `SLARemediationEngine` triggered on `PreBreachWarningEvent`
  - Remediation action types: reroute work (reassign tasks to alternative resources), shift resources (scale up capacity), escalate (notify on-call team via configured notification channel)
  - Generate `ProposedAction` for each remediation type and submit to Execution_Engine for simulation and approval routing
  - Actions must be submitted before breach occurs (proactive, not reactive)
  - _Requirements: 7.2, 7.3_

- [ ] 32. Implement SLA breach ledger recording (SLA Prevention)
  - On `BREACHED` state transition, write `LedgerEntry` to Liquid_Ledger within 60 seconds
  - Ledger entry must include: breach event type, `contract_id`, breach duration, `estimated_penalty_usd`
  - Implement breach recording as a transactional write with retry on failure (max 3 retries within 60s window)
  - _Requirements: 7.4_

- [ ]* 32.1 Write property test for SLA breach ledger recording latency
  - **Property 24: SLA Breach Ledger Recording Latency** — ledger entry with all four required fields must be written within 60 seconds of breach detection for every detected breach
  - **Validates: Requirements 7.4**

- [ ]* 32.2 Write unit tests for SLA Prevention agent end-to-end
  - Test: metric at 91% of threshold → WARNING state → `PreBreachWarningEvent` emitted → remediation action proposed
  - Test: metric crosses threshold → BREACHED → ledger entry written within 60s with penalty math
  - Test: malformed contract JSON → rejected with descriptive error, existing contracts unchanged
  - _Requirements: 7.1, 7.2, 7.4, 7.6_

- [ ] 33. Checkpoint — SLA and Penalty Prevention Agent complete
  - Verify pre-breach warning fires at 10% proximity before threshold crossing
  - Verify penalty math formula is attached to all breach events
  - Verify remediation actions are proposed (not just alerts) on pre-breach warning
  - Verify breach ledger entry written within 60s
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 34. Implement utilization monitoring across infrastructure, tools, and teams (Resource Optimization)
  - Extend `AuditorAgent` to collect utilization metrics: CPU, memory, storage, network per resource
  - Collect tool utilization: SaaS license usage rates, active vs inactive seats
  - Collect team utilization: compute allocation vs actual consumption per team/cost center
  - Store utilization time series in PostgreSQL with `(tenant_id, resource_id, timestamp)` index
  - Publish utilization summary events to `events.cost_leakage` when utilization falls below configured thresholds
  - _Requirements: 1.1, 1.4_

- [ ] 35. Implement consolidation recommendation engine with ROI math (Resource Optimization)
  - Implement `ConsolidationRecommender` that analyzes utilization data to identify consolidation opportunities
  - For each opportunity, compute: `consolidation_savings = sum(current_costs) - consolidated_cost`
  - Attach ROI math: `{ resources_to_consolidate[], current_total_cost_usd, consolidated_cost_usd, monthly_savings_usd, payback_period_days, formula_string }`
  - Generate `ProposedAction` with `action_type = CONSOLIDATE` and full ROI math attached
  - Submit to Execution_Engine for simulation and approval routing
  - _Requirements: 1.2, 10.1, 10.3_

- [x] 36. Implement Digital Twin simulation engine (Resource Optimization)
  - Implement `DigitalTwin` with `simulate(action)` and `updateState(outcome)` methods
  - `simulate()`: apply proposed action to a copy of current `InfrastructureSnapshot` (stored in Redis); return `SimulationResult` with predicted outcome, cost delta, and risk indicators
  - `simulate()` must NOT modify actual infrastructure state
  - `updateState()`: update twin with real execution results to maintain accuracy
  - Store `InfrastructureSnapshot` in Redis with `twin:{tenant_id}:{resource_id}` key pattern
  - _Requirements: 3.1_

- [ ]* 36.1 Write property test for simulation precedes execution
  - **Property 7: Simulation Precedes Execution** — a `SimulationResult` with matching `action_id` must exist before any execution record is created; no execution without prior simulation
  - **Validates: Requirements 3.1**

- [ ] 37. Implement risk scoring model (Resource Optimization)
  - Implement `RiskScorer.score(action, simulation)` using weighted formula:
    - `blast_radius_score = f(affected_resource_count, resource_criticality)` × 0.30
    - `reversibility_score = f(action_type, rollback_complexity)` × 0.25
    - `confidence_score = f(simulation_accuracy_history, data_freshness)` × 0.25
    - `financial_score = f(estimated_cost_delta, tenant_budget_fraction)` × 0.20
    - `risk_score = weighted_sum * 100` (normalized to 0–100)
  - Assign both `risk_score` and `confidence_threshold` (0–100) to every `ScoredAction`
  - _Requirements: 3.2_

- [ ]* 37.1 Write property test for risk and confidence score range invariant
  - **Property 8: Risk and Confidence Score Range Invariant** — both `risk_score` and `confidence_threshold` must be integers in [0, 100] for every scored action
  - **Validates: Requirements 3.2**

- [ ] 38. Implement approval routing workflow (Resource Optimization)
  - Implement `ApprovalRouter.route(action)` evaluating rules in order:
    1. `risk_score > 70` → `REQUIRE_HUMAN_APPROVAL`
    2. `confidence_threshold < tenant.min_confidence` → `QUEUE_FOR_HUMAN_REVIEW`
    3. `projected_roi < 0` → `FLAG_FOR_HUMAN_REVIEW`
    4. matches cached plan AND `risk_score < 30` → `AUTO_EXECUTE_CACHED`
    5. else → `AUTO_EXECUTE`
  - Publish `ScoredAction` with `approval_state` to `events.financial` Kafka topic
  - _Requirements: 3.3, 3.4, 4.6, 10.8_

- [ ]* 38.1 Write property test for high-risk and low-confidence approval gating
  - **Property 9: High-Risk and Low-Confidence Approval Gating** — any action with `risk_score > 70` OR `confidence_threshold < tenant.min_confidence` must not be auto-executed; `approval_state` must be `REQUIRE_HUMAN_APPROVAL` or `QUEUED_FOR_REVIEW` before any execution record exists
  - **Validates: Requirements 3.3, 3.4**

- [ ]* 38.2 Write property test for negative projected ROI flagging
  - **Property 36: Negative Projected ROI Flagging** — any action with `projected_roi < 0` must have `approval_state = FLAG_FOR_HUMAN_REVIEW` before any execution record is created
  - **Validates: Requirements 10.8**

- [ ] 39. Implement execution pipeline — approved changes actually executed (Resource Optimization)
  - Implement `ExecutionEngine.execute(approvedAction)`: apply action to real infrastructure via cloud provider APIs
  - Capture `ExecutionOutcome`: `actual_savings_usd`, `simulation_deviation_pct`, `executed_at`
  - Compute `simulation_deviation_pct = abs(actual_savings - projected_savings) / projected_savings * 100`
  - Trigger rollback if `simulation_deviation_pct > 20%`
  - Update `DigitalTwin` state with actual outcome
  - Publish `ExecutionOutcome` to `events.ledger_writes` for Liquid_Ledger recording
  - _Requirements: 3.1, 3.5, 3.7_

- [ ] 40. Implement rollback mechanism (Resource Optimization)
  - Implement `RollbackManager.captureSnapshot(resources)`: snapshot resource state before every execution
  - Implement `RollbackManager.rollback(actionId)`: restore resources to pre-action snapshot within 300 seconds
  - Emit `RollbackEvent` to Liquid_Ledger on rollback initiation
  - If rollback fails to complete within 300 seconds, escalate to Governor_Agent for kill-switch evaluation
  - Track `simulation_accuracy_metric` = percentage of actions whose outcomes matched simulation within 20%
  - _Requirements: 3.5, 3.6, 3.7, 3.8_

- [ ]* 40.1 Write property test for rollback trigger on simulation deviation
  - **Property 10: Rollback Trigger on Simulation Deviation** — for any executed action with `simulation_deviation_pct > 20%`, `rollback_triggered` must be `true` and a `RollbackEvent` must exist in the Liquid_Ledger
  - **Validates: Requirements 3.5**

- [ ]* 40.2 Write property test for rollback completion latency
  - **Property 11: Rollback Completion Latency** — time from rollback initiation to resource restoration must be ≤300 seconds; if deadline missed, `GovernanceEscalationEvent` must be emitted
  - **Validates: Requirements 3.6, 3.8**

- [ ] 41. Implement Agentic Plan Cache (Resource Optimization)
  - Implement `AgenticPlanCache` backed by Redis with 90-day TTL
  - `lookup(action)`: key = `hash(action_type + resource_id + parameters)`; return `CachedPlan` if exact match found
  - `store(plan)`: persist with `risk_score`, `simulation_results`, `approval_records`
  - `invalidate(resourceId)`: invalidate all cached plans for a resource when its state changes
  - Wire into `ApprovalRouter`: if cache hit AND `risk_score < 30`, use cached simulation result without new simulation
  - _Requirements: 4.5, 4.6_

- [ ]* 41.1 Write property test for cached plan no re-simulation
  - **Property 16: Cached Plan Execution Without Re-Simulation** — for any action exactly matching a cached plan with `risk_score < 30`, no new simulation record must be created; the cached result must be used
  - **Validates: Requirements 4.6**

- [ ]* 41.2 Write unit tests for Resource Optimization agent end-to-end
  - Test: resource at 15% CPU utilization → OVER_PROVISIONED → consolidation recommendation with ROI math → simulation → execution → outcome recorded
  - Test: execution deviates >20% from simulation → rollback triggered within 300s
  - Test: action matches cached plan with risk_score < 30 → no new simulation, cached result used
  - _Requirements: 3.1, 3.5, 3.6, 4.6_

- [ ] 42. Checkpoint — Resource Optimization Agent complete
  - Verify digital twin simulation runs before every execution
  - Verify risk scores are in [0, 100]
  - Verify high-risk actions require human approval
  - Verify rollback completes within 300s and is ledger-recorded
  - Verify plan cache prevents re-simulation on exact matches
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 43. Implement transaction reconciliation engine (Financial Operations)
  - Implement `TransactionReconciler` in Finance_Agent that matches executed actions against billing records
  - For each executed action, fetch corresponding billing records from cloud connectors within 24 hours of execution
  - Flag discrepancies: `actual_cost != projected_cost` by more than 5% (configurable threshold)
  - Produce `ReconciliationReport`: `{ action_id, projected_cost_usd, actual_cost_usd, discrepancy_usd, discrepancy_pct, flagged }`
  - Publish flagged discrepancies to `events.financial` for ROI_Engine processing
  - _Requirements: 10.1, 14.1_

- [ ] 44. Implement variance analysis with root-cause attribution (Financial Operations)
  - Implement `VarianceAnalyzer` that produces root-cause attribution for each flagged discrepancy
  - Root-cause categories: model_error (reasoning produced incorrect projection), data_staleness (billing data was stale at decision time), infrastructure_change (resource state changed between simulation and execution), external_factor (cloud provider pricing change)
  - Attach `root_cause_attribution` to `ReconciliationReport`
  - Submit confirmed reasoning errors (root_cause = model_error) to Reasoning_Engine for post-mortem analysis
  - _Requirements: 14.1, 14.2_

- [ ] 45. Implement financial simulation model (Financial Operations)
  - Implement `FinancialSimulator.runSimulation(scenario)` for scenario modeling of proposed actions
  - Scenario inputs: proposed action, current billing state, SLA contract projections, carbon savings projections
  - Scenario outputs: `SimulationResult` with projected cost delta, projected savings, projected penalty avoidance, projected carbon savings
  - Wire Finance_Agent simulation outputs into `ProposedAction.projected_savings_usd` and `ROIResult.avoided_loss_usd`
  - _Requirements: 10.3, 10.4_

- [x] 46. Implement ROI Engine with net ROI formula (Financial Operations)
  - Implement `ROIEngine.calculate(action)` with formula: `net_roi_pct = (cost_savings_usd - execution_cost_usd - reasoning_cost_usd + avoided_loss_usd) / platform_cost_usd * 100`
  - Implement `costPerCorrectResult(tenantId, period)`: `total_reasoning_cost / count(sessions where outcome_matched_projection = true)`
  - Implement `avoidedLoss(tenantId, period)`: sum of `abs(projected_negative_impact_usd)` for blocked/corrected actions
  - Implement `projectROI(proposedAction)`: pre-execution ROI estimate using Finance_Agent simulation + Contract_Digital_Twin projections + Carbon_Scheduler savings
  - Expose `projected_roi` to Execution_Engine for inclusion in approval routing
  - _Requirements: 10.1, 10.3, 10.4, 10.6, 10.7_

- [ ]* 46.1 Write property test for net ROI formula correctness
  - **Property 33: Net ROI Formula Correctness** — for any action with known cost components, `net_roi_pct` must equal `(savings - exec_cost - reasoning_cost + avoided_loss) / platform_cost * 100`; formula applied consistently for all actions
  - **Validates: Requirements 10.1**

- [ ]* 46.2 Write property test for avoided loss as positive ROI component
  - **Property 35: Avoided Loss as Positive ROI Component** — non-zero `avoided_loss_usd` must always increase `net_roi_pct`; avoided loss must be a positive addend in the numerator
  - **Validates: Requirements 10.7**

- [ ] 47. Implement monthly ROI report aggregation (Financial Operations)
  - Implement `ROIEngine.aggregateMonthlyReport(tenantId, month)`: sum individual `net_roi_pct` values for all completed actions in the month
  - Schedule monthly report generation job (runs on first day of each month for prior month)
  - Store monthly report in PostgreSQL with `(tenant_id, year_month)` key
  - Expose monthly report via REST API endpoint for Command_Center consumption
  - _Requirements: 10.2_

- [ ]* 47.1 Write property test for monthly ROI aggregation invariant
  - **Property 34: Monthly ROI Aggregation Invariant** — monthly ROI report value must equal the sum of individual `net_roi_pct` values for all completed actions in that month for that tenant
  - **Validates: Requirements 10.2**

- [ ] 48. Implement outcome vs projection comparison and reasoning error detection (Financial Operations)
  - Implement `ROIEngine.compareOutcome(action)`: compare `actual_savings_usd` vs `projected_savings_usd` within 24 hours of execution
  - Flag action as `ReasoningErrorCandidate` if actual outcome is worse than projected by >15%
  - Submit `ReasoningErrorCandidate` to Reasoning_Engine for post-mortem analysis
  - Update `ReasoningSession.outcome_matched_projection` field based on comparison result
  - _Requirements: 14.1, 14.2_

- [ ]* 48.1 Write property test for outcome comparison timeliness
  - **Property 47: Outcome vs Projection Comparison Timeliness** — ROI_Engine must perform outcome vs projection comparison within 24 hours of execution timestamp for every completed action
  - **Validates: Requirements 14.1**

- [ ]* 48.2 Write property test for reasoning error flagging threshold
  - **Property 48: Reasoning Error Flagging Threshold** — any action where actual outcome is worse than projected by >15% must be flagged as `ReasoningErrorCandidate`
  - **Validates: Requirements 14.2**

- [ ]* 48.3 Write unit tests for Financial Operations agent end-to-end
  - Test: executed action with known cost components → ROI formula applied correctly → monthly report aggregated
  - Test: actual savings 20% worse than projected → flagged as reasoning error candidate → submitted for post-mortem
  - Test: blocked action with negative projected ROI → avoided loss calculated and included in ROI
  - _Requirements: 10.1, 10.2, 14.1, 14.2_

- [ ] 49. Checkpoint — Financial Operations Agent complete
  - Verify ROI formula: `net_roi = (savings - exec_cost - reasoning_cost + avoided_loss) / platform_cost`
  - Verify monthly aggregation equals sum of individual action ROIs
  - Verify outcome comparison runs within 24h of execution
  - Verify reasoning errors are flagged at >15% deviation
  - Ensure all tests pass, ask the user if questions arise.

- [x] 50. Implement kill-switch circuit breaker (Governor_Agent)
  - Implement `KillSwitchCircuitBreaker` with states: `CLOSED → OPEN → HALF_OPEN`
  - `activate(tenantId, userId)`: set state to `OPEN`, publish `KillSwitchEvent` to `governance.kill_switch` topic with `priority: CRITICAL`
  - All agent execution loops subscribe to `governance.kill_switch` with a dedicated consumer thread (not shared with normal event processing)
  - On receipt, agents immediately reject all pending execution requests and flush work queues
  - Governor_Agent confirms halt by polling agent status endpoints; escalates if any agent does not confirm within 5 seconds
  - Log activation event (event type, activating user identity, timestamp) to Liquid_Ledger
  - `reset(tenantId, adminUserId)`: set state to `HALF_OPEN`; requires health verification before returning to `CLOSED`
  - _Requirements: 4.1, 4.2_

- [ ]* 50.1 Write property test for kill-switch activation latency
  - **Property 12: Kill-Switch Activation Latency** — all autonomous agent actions for the affected tenant must be halted within 5 seconds of kill-switch command receipt
  - **Validates: Requirements 4.1**

- [ ]* 50.2 Write property test for kill-switch ledger entry completeness
  - **Property 13: Kill-Switch Ledger Entry Completeness** — Liquid_Ledger must contain an entry with activation event type, activating user identity, and activation timestamp; all three fields required
  - **Validates: Requirements 4.2**

- [x] 51. Implement DoW protection rolling accumulator (Governor_Agent)
  - Implement `RollingSpendAccumulator` with 24-hour window using hourly buckets in Redis
  - `add(tenantId, amount_usd)`: increment current hour bucket; compute rolling sum of last 24 buckets
  - If `rollingSum() > tenant.dow_protection_limit_usd`: auto-activate kill-switch with `activated_by = "SYSTEM_DOW"` and notify tenant administrators
  - Accumulator must be monotonically increasing within the 24-hour window and reset at window boundary
  - _Requirements: 4.4_

- [ ]* 51.1 Write property test for DoW protection auto-kill
  - **Property 15: DoW Protection Auto-Kill** — when rolling 24h accumulator exceeds `dow_protection_limit_usd`, kill-switch must be automatically activated; accumulator must be monotonically increasing within window
  - **Validates: Requirements 4.4**

- [x] 52. Implement resource tagging enforcement (Governor_Agent)
  - Implement `TagValidator.validate(resource, tenantRequiredTags)`: return `TagValidationError` if any required tag is missing
  - Wire `TagValidator` into Execution_Engine pre-execution check: block execution and return `TagValidationError` if resource lacks required tags
  - Tag validation must occur before simulation and execution
  - _Requirements: 4.3_

- [ ]* 52.1 Write property test for untagged resource execution block
  - **Property 14: Untagged Resource Execution Block** — Execution_Engine must not create an execution record for any resource missing required tenant-defined tags; tag validation must precede execution
  - **Validates: Requirements 4.3**

- [x] 53. Implement behavioral anomaly monitor (Governor_Agent)
  - Implement `BehaviorAnomalyMonitor.monitor(agentId, actionRate)`: compute 7-day rolling baseline (mean and standard deviation) per agent
  - Flag agent as behavioral anomaly candidate if current action rate exceeds baseline by >3 standard deviations
  - Trigger `isolateAgent()` on confirmed anomaly
  - _Requirements: 13.1_

- [ ]* 53.1 Write property test for behavioral anomaly detection
  - **Property 43: Behavioral Anomaly Detection** — any agent whose action rate exceeds 3σ above its 7-day rolling baseline must be flagged; no agent exceeding the threshold may go undetected
  - **Validates: Requirements 13.1**

- [x] 54. Implement rogue agent isolation (Governor_Agent)
  - Implement `GovernorAgent.isolateAgent(agentId)`: suspend agent execution and revoke Execution_Engine access within 10 seconds of detection
  - Emit `ContainmentEvent` to Liquid_Ledger
  - Notify tenant administrators via configured notification channels
  - Both ledger write and notification must complete before isolation is considered complete
  - _Requirements: 13.2, 13.3_

- [ ]* 54.1 Write property test for rogue agent isolation latency
  - **Property 44: Rogue Agent Isolation Latency** — agent execution must be suspended and Execution_Engine access revoked within 10 seconds of rogue detection
  - **Validates: Requirements 13.2**

- [ ]* 54.2 Write property test for containment event ledger entry
  - **Property 45: Containment Event Ledger Entry** — `ContainmentEvent` ledger entry and tenant administrator notification must both occur before isolation is considered complete
  - **Validates: Requirements 13.3**

- [x] 55. Implement prompt injection sanitizer (Governor_Agent)
  - Implement `InjectionSanitizer.sanitize(payload)` scanning for: mathematical payload injection patterns, logical structure injection patterns, role-override instruction patterns
  - Apply sanitizer to all incoming agent task payloads before they reach the Reasoning_Engine
  - On detection: reject payload, log attempt to Liquid_Ledger, notify tenant administrators
  - No injected payload may reach the Reasoning_Engine
  - _Requirements: 13.6, 16.5, 16.6_

- [ ]* 55.1 Write property test for prompt injection detection and blocking
  - **Property 46: Prompt Injection Detection and Blocking** — any payload containing a known injection pattern must be rejected, logged to Liquid_Ledger, and tenant admins notified; no injected payload may reach the Reasoning_Engine
  - **Validates: Requirements 13.6, 16.5, 16.6**

- [ ] 56. Implement confidence threshold degradation and agent suspension (Governor_Agent)
  - Implement `GovernorAgent.degradeConfidence(agentId, points)`: reduce agent's `confidence_threshold` by specified points atomically; floor at 0
  - On confirmed reasoning error: reduce confidence by exactly 10 points
  - Track `consecutive_errors_24h` counter per agent; reset on successful action
  - If `consecutive_errors_24h >= 3`: suspend agent, set `status = SUSPENDED`, require manual re-enablement by Tenant Administrator
  - _Requirements: 14.3, 14.5_

- [ ]* 56.1 Write property test for confidence threshold degradation on error
  - **Property 49: Confidence Threshold Degradation on Error** — confirmed reasoning error must reduce responsible agent's `confidence_threshold` by exactly 10 points; reduction must not go below 0
  - **Validates: Requirements 14.3**

- [ ]* 56.2 Write property test for three-strike agent suspension
  - **Property 50: Three-Strike Agent Suspension** — agent accumulating 3 consecutive confirmed reasoning errors within 24 hours must be suspended with `status = SUSPENDED`; requires manual re-enablement
  - **Validates: Requirements 14.5**

- [ ] 57. Implement post-incident report generator (Governor_Agent)
  - Implement `PostIncidentReportGenerator.generate(containmentEvent)`: produce report including sequence of anomalous actions, estimated financial impact, and recommended remediation steps
  - Generate report for every containment event (rogue agent isolation)
  - Store report in PostgreSQL and expose via REST API for Command_Center Governance Panel
  - _Requirements: 13.4_

- [ ] 58. Checkpoint — Governor_Agent and Governance complete
  - Verify kill-switch halts all agents within 5s
  - Verify DoW auto-kill triggers at limit breach
  - Verify untagged resources are blocked before execution
  - Verify rogue agent isolated within 10s
  - Verify prompt injection payloads are blocked and logged
  - Ensure all tests pass, ask the user if questions arise.

- [x] 59. Implement three-tier reasoning routing logic
  - Implement `ReasoningRouter.route(task)` computing composite signal: `composite = (risk_score * 0.4) + (normalize(financial_impact) * 0.4) + (tenant_config_factor * 0.2)`
  - Tier selection: `composite < 0.30 AND financial_impact < $1,000` → FAST; `composite 0.30–0.60 OR financial_impact $1k–$50k` → MEDIUM; `composite > 0.60 OR financial_impact > $50,000` → DEEP
  - No event may be routed to a tier that does not match its composite signal
  - _Requirements: 2.2, 2.3, 2.4, 2.5_

- [ ]* 59.1 Write property test for reasoning tier routing correctness
  - **Property 4: Reasoning Tier Routing Correctness** — for any incoming cost event, routing decision must satisfy all tier conditions simultaneously; no event routed to a non-matching tier
  - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [ ] 60. Implement Model Provider Abstraction Layer
  - Define `ModelProvider` interface: `infer(prompt, context)`, `getLatencyProfile()`, `getCostPerToken()`, `getContextWindowSize()`, `getProviderMetrics()`
  - Implement providers: `OpenAIProvider` (o3-class Deep, GPT-4o-class Fast), `GeminiProvider` (3.1 Pro-class Deep/large-context, Flash-class Fast), `AnthropicProvider` (Claude Sonnet-class Medium), `DeepSeekProvider` (R1-class on-prem Deep), `Llama4Provider` (Scout-class on-prem large-context), `CustomProvider` (generic OpenAI-compatible HTTP endpoint)
  - Provider selection per tier: Fast → GPT-4o-class or Gemini Flash; Medium → Claude Sonnet or Gemini Pro; Deep → o3 or Gemini 3.1 Pro or DeepSeek-R1; Large context (≥1M tokens) → Gemini 3.1 Pro or Llama 4 Scout
  - Support configuration of multiple endpoints without code changes
  - _Requirements: 17.1, 17.2, 17.3, 17.4_

- [ ]* 60.1 Write property test for model routing by task type
  - **Property 57: Model Routing by Task Type** — financial anomaly detection tasks must route to fast inference model (≤500ms); high-complexity tasks with `risk_score > 60` must route to frontier deep reasoning model; large context tasks (≥1M tokens) must route to model with ≥1M context window
  - **Validates: Requirements 17.2, 17.3, 17.4**

- [ ] 61. Implement Fast tier reasoning (≤500ms)
  - Implement `FastTierProcessor` using lightweight model (GPT-4o-class or Gemini Flash-class)
  - Enforce ≤500ms latency SLA; return timeout error if exceeded
  - Route financial anomaly detection tasks to Fast tier
  - Track `latency_ms` and `cost_usd` per session in `ReasoningSession` record
  - _Requirements: 2.1, 2.2, 17.2_

- [ ] 62. Implement Medium tier reasoning (5–15s)
  - Implement `MediumTierProcessor` using Claude Sonnet-class or Gemini Pro-class model
  - Enforce 5–15s latency window; apply logical consistency checks
  - Track `latency_ms` and `cost_usd` per session
  - _Requirements: 2.1, 2.3_

- [ ] 63. Implement Deep tier with dual independent reasoning chains
  - Implement `DeepModeProcessor.process(task)`:
    - Generate `chainA = generateChain(prompt, context, random_seed())`
    - Generate `chainB = generateChain(prompt, context, random_seed())` (independent)
    - `compareChains(chainA, chainB)`: detect contradictions in conclusions
    - If contradiction: return `ReasoningConflict` → escalate to human review; do not auto-execute
    - If no contradiction: return `mergedConclusion(chainA, chainB)`
  - Enforce 30–120s latency window
  - Track cumulative inference cost in USD per session; report to ROI_Engine
  - _Requirements: 2.1, 2.4, 16.1, 16.2_

- [ ]* 63.1 Write property test for Deep Mode dual chain generation
  - **Property 54: Deep Mode Dual Chain Generation** — every Deep Mode task must generate at least two independent reasoning chains before producing a recommendation; fewer than two chains must not be committed
  - **Validates: Requirements 16.1**

- [ ]* 63.2 Write property test for reasoning conflict escalation
  - **Property 55: Reasoning Conflict Escalation** — contradictory conclusions from independent chains must be flagged as `ReasoningConflict` and routed to human review; no contradictory Deep Mode output may be auto-executed
  - **Validates: Requirements 16.2**

- [ ] 64. Implement hallucination detection pipeline
  - Implement `HallucinationDetector.validateClaims(output, dataSources)`: for each factual claim in reasoning output, attempt verification against connected data sources
  - If claim unverifiable: annotate with `UNVERIFIED` flag; reduce `confidence_threshold` by exactly 20 points per unverified claim
  - Track `structured_hallucination_rate_pct` per agent: percentage of Deep Mode outputs containing unverified claims
  - Expose `structured_hallucination_rate_pct` in `AgentHealthStatus`
  - _Requirements: 16.3, 16.4, 16.7_

- [ ]* 64.1 Write property test for unverified claim confidence reduction
  - **Property 56: Unverified Claim Confidence Reduction** — each unverified factual claim must be annotated with `UNVERIFIED` flag and reduce `confidence_threshold` by exactly 20 points; reduction applied per claim
  - **Validates: Requirements 16.4**

- [ ] 65. Implement cost-per-correct-result tracker and budget exhaustion handling
  - Implement `CostTracker.costPerCorrectResult()`: `sum(session_costs) / count(correct_sessions)` where correct = outcome matched projection within 15%
  - Metric must never be negative
  - Implement budget exhaustion: when session cost reaches `tenant.max_reasoning_budget_usd`, terminate processing and return partial result with `budget_exhausted = true` and `completeness_pct`
  - Implement graceful degradation: on budget exhaustion, fall back to next cheaper model tier that satisfies reasoning depth requirement
  - _Requirements: 2.7, 2.9, 2.10, 2.11, 17.5_

- [ ]* 65.1 Write property test for cost-per-correct-result calculation invariant
  - **Property 6: Cost-Per-Correct-Result Calculation Invariant** — `cost_per_correct_result = sum(session_costs) / count(correct_sessions)` for any set with at least one correct result; metric must never be negative
  - **Validates: Requirements 2.9, 10.6**

- [ ]* 65.2 Write property test for budget-constrained model selection
  - **Property 58: Budget-Constrained Model Selection** — when `max_reasoning_cost_usd` is configured, selected model must be the lowest-cost model meeting required reasoning depth; a more expensive model must not be selected when a cheaper qualifying model exists
  - **Validates: Requirements 17.5**

- [ ]* 65.3 Write property test for reasoning tier latency bounds
  - **Property 5: Reasoning Tier Latency Bounds** — FAST ≤500ms, MEDIUM 5–15s, DEEP 30–120s; every reasoning task response must fall within its assigned tier's bounds
  - **Validates: Requirements 2.1**

- [ ] 66. Checkpoint — Reasoning Engine complete
  - Verify tier routing matches composite signal for all combinations
  - Verify Deep Mode generates two independent chains
  - Verify contradictions escalate to human review
  - Verify unverified claims reduce confidence by 20 points
  - Verify budget exhaustion returns partial result with completeness_pct
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 67. Implement carbon-aware workload scheduler (Green_Architect_Agent)
  - Implement `CarbonAwareScheduler.schedule(workload)`:
    - If `not workload.is_time_shiftable`: return `EXECUTE_NOW`
    - Fetch `current_intensity` and 24h `forecast` for workload region
    - Find candidate windows where `intensity <= current_intensity * 0.80` AND `window.start <= max_deferral_deadline`
    - If no candidates and `now() >= max_deferral_deadline`: return `EXECUTE_NOW` (deadline enforcement)
    - Else select `best_window = min_by(intensity)` from candidates
    - Return `SCHEDULE(window=best_window, savings=co2e_savings)`
  - _Requirements: 8.2, 8.4_

- [ ]* 67.1 Write property test for carbon scheduling intensity reduction
  - **Property 25: Carbon Scheduling Intensity Reduction** — for any rescheduled workload, the scheduled window's forecasted carbon intensity must be at least 20% lower than intensity at scheduling decision time
  - **Validates: Requirements 8.2**

- [ ]* 67.2 Write property test for deferral deadline enforcement
  - **Property 27: Deferral Deadline Enforcement** — any time-shifted workload with a configured `max_deferral_deadline` must execute no later than that deadline; `status` must transition to `EXECUTING` at or before the deadline
  - **Validates: Requirements 8.4**

- [ ] 68. Implement CO₂e savings calculator (Green_Architect_Agent)
  - Implement `CO2eSavingsCalculator.calculate(workload, originalWindow, scheduledWindow)`:
    - `carbon_savings_kgco2e = workload.energy_kwh * (original_intensity - scheduled_intensity) / 1000`
    - Result must be ≥ 0 (non-negative savings invariant)
  - Attach `carbon_savings_kgco2e` to `WorkloadSchedule` record on scheduling
  - _Requirements: 8.3_

- [ ]* 68.1 Write property test for carbon savings non-negativity
  - **Property 26: Carbon Savings Non-Negativity** — `carbon_savings_kgco2e` must be ≥ 0 for any rescheduled workload; a workload rescheduled to a lower-carbon window must never report negative savings
  - **Validates: Requirements 8.3**

- [ ] 69. Implement monthly carbon savings summary (Green_Architect_Agent)
  - Implement `GreenArchitectAgent.getMonthlySummary(tenantId, month)`: aggregate `carbon_savings_kgco2e` across all `WorkloadSchedule` records with `status = COMPLETED` for the tenant and month
  - Aggregate by workload category and cloud region
  - Monthly summary value must equal the sum of individual `carbon_savings_kgco2e` values
  - Expose via REST API endpoint for Command_Center Primary Dashboard
  - _Requirements: 8.5_

- [ ]* 69.1 Write property test for monthly carbon savings aggregation invariant
  - **Property 28: Monthly Carbon Savings Aggregation Invariant** — monthly summary value must equal sum of `carbon_savings_kgco2e` across all completed `WorkloadSchedule` records for that tenant and month
  - **Validates: Requirements 8.5**

- [ ] 70. Implement carbon intensity feed fallback (Green_Architect_Agent)
  - Implement `CarbonIntensityFeed.isStale()`: return `true` if last successful poll was >30 minutes ago
  - On stale detection: fall back to `LastKnownIntensityCache` for scheduling decisions
  - Emit `DataStalenessWarning` event to `events.governance` Kafka topic
  - Continue scheduling using last known data until feed recovers
  - _Requirements: 8.6_

- [ ]* 70.1 Write unit tests for Green_Architect_Agent
  - Test: workload eligible for time-shifting → scheduled to lower-carbon window → savings calculated ≥ 0
  - Test: no lower-carbon window available before deadline → workload executes at deadline
  - Test: carbon feed unavailable >30 min → fallback to last known data → `DataStalenessWarning` emitted
  - _Requirements: 8.2, 8.4, 8.6_

- [x] 71. Implement SHA-256 hash-chaining append engine (Liquid Ledger)
  - Implement `LiquidLedger.append(entry)`:
    - Fetch `prev_entry` for tenant; use `GENESIS_HASH` if first entry
    - Compute `entry_hash = SHA-256(entry_id + JSON.stringify(payload) + prev_hash)`
    - Persist `LedgerEntry` with `entry_hash`, `prev_hash`, `sequence_number`
  - Implement `verifyIntegrity(tenantId, fromSeq, toSeq)`: recompute hash for each entry; emit `TamperDetectionAlert` on mismatch
  - All agent actions, governance events, kill-switch activations, rollbacks, SLA breaches, and AP2 transactions must produce a ledger entry
  - _Requirements: 9.1, 9.2_

- [ ]* 71.1 Write property test for ledger entry completeness
  - **Property 29: Ledger Entry Completeness** — for every system event of type agent action, governance event, kill-switch activation, rollback, SLA breach, or AP2 transaction, a corresponding `LedgerEntry` must exist; no event of these types may occur without a ledger record
  - **Validates: Requirements 9.1**

- [ ]* 71.2 Write property test for hash chain integrity
  - **Property 30: Hash Chain Integrity** — for any sequence of ledger entries, each entry's `prev_hash` must equal the `entry_hash` of the immediately preceding entry; `entry_hash` must equal `SHA-256(entry_id || payload || prev_hash)`; any modification must cause verification failure for all subsequent entries
  - **Validates: Requirements 9.2**

- [ ]* 71.3 Write property test for tamper detection alert
  - **Property 31: Tamper Detection Alert** — any ledger entry where recomputed hash ≠ stored `entry_hash` must emit `TamperDetectionAlert` to Governor_Agent and Tenant administrator; no tampered entry may pass silently
  - **Validates: Requirements 9.5**

- [ ] 72. Implement Liquid Ledger query engine and audit export pipeline
  - Implement `LiquidLedger.query(tenantId, filters)`: filter by agent identifier, action type, resource identifier, and time range
  - Query must return exactly the set of entries matching the filter predicate (no omissions, no false inclusions)
  - Implement streaming audit export: produce verifiable export file for specified time range; ≤30-day ranges must complete within 60 seconds
  - _Requirements: 9.4, 9.6_

- [ ]* 72.1 Write property test for ledger query correctness
  - **Property 32: Ledger Query Correctness** — query results must be exactly the set of entries matching the filter predicate; no matching entries omitted, no non-matching entries included
  - **Validates: Requirements 9.6**

- [ ] 73. Checkpoint — Liquid Ledger complete
  - Verify hash chain integrity across a sequence of 100+ entries
  - Verify tamper detection fires on any modified entry
  - Verify audit export for 30-day range completes within 60s
  - Verify query filters return exact matching sets
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 74. Implement SAML 2.0 / OIDC authentication integration
  - Implement SAML 2.0 SP-initiated SSO flow: redirect to enterprise IdP, validate assertion, extract user identity and role
  - Implement OIDC authorization code flow: redirect to IdP, exchange code for tokens, validate ID token
  - On successful authentication: issue short-lived JWT (15-min access token) + refresh token (8h)
  - JWT payload: `{ tenant_id, user_id, role, issued_at, expires_at }`
  - _Requirements: 15.1_

- [ ] 75. Implement JWT validation and session timeout enforcement
  - Implement JWT validation middleware: verify signature, check expiry, extract `tenant_id` and `role` claims
  - Implement session inactivity tracker: reset timer on each request; terminate session after 30 minutes of inactivity
  - On session termination: invalidate refresh token, return 401 with authentication challenge
  - No request from an expired session may be processed
  - _Requirements: 11.8, 15.1_

- [ ]* 75.1 Write property test for session timeout enforcement
  - **Property 39: Session Timeout Enforcement** — any session inactive for >30 minutes must be terminated; subsequent requests must receive an authentication challenge; no request from an expired session may be processed
  - **Validates: Requirements 11.8**

- [ ] 76. Implement RBAC middleware with 4-role permission matrix
  - Implement `AuthorizationMiddleware` enforcing permission matrix for 4 roles: Read-Only Analyst, Operator, Finance Administrator, Platform Administrator
  - Permission matrix: kill-switch activation (Operator+), kill-switch reset (Platform Admin only), approve high-risk action (Operator+), configure DoW limit (Finance Admin+), manage tenants (Platform Admin only), export audit log (all roles), reset agent confidence (Finance Admin+)
  - On unauthorized attempt: deny action and log `UnauthorizedAttemptEvent` to Liquid_Ledger
  - _Requirements: 15.2, 15.3_

- [ ]* 76.1 Write property test for RBAC permission enforcement
  - **Property 51: RBAC Permission Enforcement** — any user action outside the user's assigned role permissions must be denied and an `UnauthorizedAttemptEvent` logged to Liquid_Ledger; no out-of-role action may succeed
  - **Validates: Requirements 15.2, 15.3**

- [ ] 77. Implement AES-256-GCM encryption for data at rest
  - Implement encryption layer for all database fields containing financial data, PII, and credentials using AES-256-GCM
  - Integrate with cloud KMS (AWS KMS / Azure Key Vault / GCP Cloud KMS) for key management
  - Encrypt Kubernetes Secrets at rest via cloud KMS
  - _Requirements: 15.4_

- [ ] 78. Implement API key management
  - Implement API key generation: scope each key to a specific `tenant_id` and `role`
  - Store API keys as PBKDF2-hashed values; never persist plaintext after initial generation
  - Implement API key validation middleware: verify hash, extract tenant and role scope
  - Enforce scope: a key scoped to Tenant T1 must never grant access to T2's resources
  - On API key usage: log `key_identifier`, `calling_ip`, and `requested_operation` to Liquid_Ledger
  - _Requirements: 15.5, 15.6_

- [ ]* 78.1 Write property test for API key scope enforcement
  - **Property 52: API Key Scope Enforcement** — requests authenticated with a key scoped to Tenant T1 must never be granted access to Tenant T2's resources
  - **Validates: Requirements 15.5**

- [ ]* 78.2 Write property test for API key usage logging completeness
  - **Property 53: API Key Usage Logging Completeness** — every API key usage event must produce a Liquid_Ledger entry with key identifier, calling IP address, and requested operation; all three fields required
  - **Validates: Requirements 15.6**

- [ ] 79. Checkpoint — Enterprise Security complete
  - Verify SAML/OIDC authentication issues JWT with correct claims
  - Verify session terminates after 30 min inactivity
  - Verify RBAC blocks out-of-role actions and logs unauthorized attempts
  - Verify API key scope prevents cross-tenant access
  - Ensure all tests pass, ask the user if questions arise.

- [x] 80. Set up React 18 + TypeScript Command Center project with design system
  - Initialize React 18 + TypeScript project with Vite
  - Implement dark-mode design system tokens as CSS custom properties: background, surface, border, text, accent colors (blue, green, yellow, red, orange, purple)
  - Set up Zustand for state management
  - Set up WebSocket client connecting to `command-center-api` for real-time push updates
  - Implement `AuthGuard` component: enforce SAML/OIDC authentication before rendering any view; handle session timeout redirect
  - Implement `Layout` with `TopNav` (tenant selector, user info, kill-switch quick-access) and `SideNav` (5 view links)
  - _Requirements: 11.1, 11.7, 11.8, 15.1_

- [x] 81. Implement WebSocket real-time data pipeline (≤5s refresh)
  - Implement `command-center-api` WebSocket server: subscribe to relevant Kafka topics, filter events by `tenant_id` from JWT
  - Push events to connected WebSocket clients within ≤5 seconds of event occurrence
  - Implement client-side WebSocket reconnection with exponential backoff
  - Update React state on each push event; trigger component re-render without full page reload
  - _Requirements: 11.2_

- [x] 82. Implement Primary Dashboard view
  - Implement `PrimaryDashboard` with four components:
    - `ROISummaryCard`: cumulative ROI, projected annual savings, cost-per-insight metrics (updated ≤5 min)
    - `CostLeakageStream`: real-time anomaly feed showing resource identifier, estimated hourly cost impact, detection timestamp
    - `AgentStatusRow`: health indicators for all 4 agents (status, last-action timestamp, health indicator)
    - `CarbonSavingsSummary`: monthly carbon savings from Green_Architect_Agent
  - All metrics refresh via WebSocket push (≤5s)
  - _Requirements: 1.3, 10.5, 11.1, 11.2_

- [ ]* 82.1 Write property test for cost leakage event display fields
  - **Property 3: Cost Leakage Event Display Fields** — every `CostLeakageEvent` rendered in Command_Center must contain resource identifier, estimated hourly cost impact, and detection timestamp; all three fields required
  - **Validates: Requirements 1.3**

- [x] 83. Implement Agent Intelligence View
  - Implement `AgentIntelligenceView` with:
    - `AgentCard` per agent: current status, last-action timestamp, health indicator, confidence threshold, structured hallucination rate
    - `ReasoningAccuracyChart`: reasoning accuracy percentage per agent over time
    - `ModelPerformanceTable`: per-provider metrics (latency, cost-per-token, accuracy)
  - All three fields (status, last-action timestamp, health indicator) must be present for every agent card
  - _Requirements: 11.4, 14.4, 16.7_

- [ ]* 83.1 Write property test for agent status display completeness
  - **Property 37: Agent Status Display Completeness** — every agent rendered in Agent Intelligence View must display current status, last-action timestamp, and health indicator; all three fields required
  - **Validates: Requirements 11.4**

- [x] 84. Implement Action Pipeline view with "show the math" explainability
  - Implement `ActionPipeline` with:
    - `ActionTable`: all pending, in-progress, and completed actions with `risk_score`, `confidence_threshold`, simulation status, and approval state
    - `ApprovalModal`: for high-risk actions requiring human approval; displays simulation result, risk score, and cost impact math inline
    - `RollbackHistoryPanel`: completed rollbacks with before/after state
  - Every action card must display cost impact formula inline: `savings = (current_hourly_cost - optimized_hourly_cost) * hours_per_month`
  - Implement "Why this action?" button on every action card: calls Reasoning_Engine to generate human-language explanation of the decision
  - _Requirements: 11.1, 11.5_

- [ ]* 84.1 Write property test for action pipeline display completeness
  - **Property 38: Action Pipeline Display Completeness** — every action rendered in Action Pipeline must contain `risk_score`, `confidence_threshold`, simulation status, and approval state; all four fields required
  - **Validates: Requirements 11.5**

- [x] 85. Implement Agent Network View with D3.js live A2A graph
  - Implement `AgentNetworkView` with:
    - `A2AGraphRenderer`: live D3.js (or Cytoscape.js) graph of inter-agent communication activity using A2A protocol event data from WebSocket
    - `MessageInspector`: click any node or edge to inspect A2A message details (from_agent, to_agent, task_type, payload, timestamp)
  - Graph updates in real-time as A2A messages flow through the system
  - _Requirements: 11.6_

- [x] 86. Implement Governance Panel
  - Implement `GovernancePanel` with:
    - `KillSwitchButton`: displays confirmation dialog requiring explicit confirmation before submitting kill-switch command
    - `DoWProtectionConfig`: form to configure rolling 24h spend limit per tenant
    - `ResourceTaggingPolicy`: Monaco Editor for YAML-based tag policy configuration
    - `RBACManager`: manage user role assignments
    - `ComplianceReportViewer`: view daily governance compliance reports (actions taken, blocked, kill-switch events, DoW triggers)
  - Kill-switch button must show confirmation dialog before submitting command
  - _Requirements: 11.1, 11.3, 4.7_

- [ ]* 86.1 Write unit tests for Command Center UI
  - Test: kill-switch button click → confirmation dialog appears → confirm → kill-switch command submitted
  - Test: kill-switch button click → cancel → no command submitted
  - Test: session inactive 30 min → session terminated → re-authentication required
  - Test: user with Read-Only role attempts to approve action → action denied
  - _Requirements: 11.3, 11.8, 15.2_

- [ ] 87. Checkpoint — Command Center UI complete
  - Verify all 5 views render with correct data
  - Verify WebSocket push updates within 5s
  - Verify kill-switch confirmation dialog works
  - Verify cost impact math is displayed inline on every action card
  - Verify "Why this action?" button returns human-language explanation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 88. Implement usage telemetry pipeline (Multi-Tenancy)
  - Implement `TelemetryPipeline` that records per-tenant usage at hourly granularity: compute consumption, reasoning API calls, AP2 transaction volume
  - For every active tenant, a telemetry record must exist for every completed hour (no gaps)
  - Store telemetry in PostgreSQL with `(tenant_id, hour_bucket)` key
  - Expose telemetry via REST API for billing system integration
  - _Requirements: 12.6_

- [ ]* 88.1 Write property test for usage telemetry completeness
  - **Property 42: Usage Telemetry Completeness** — for any tenant and any completed hour, a telemetry record must exist reporting compute consumption, reasoning API calls, and AP2 transaction volume; no hour may have a missing record for an active tenant
  - **Validates: Requirements 12.6**

- [ ] 89. Implement throttling mechanism for tier limit enforcement
  - Implement `ThrottlingMiddleware`: check tenant's current usage against contracted tier limits before processing each agent execution request
  - If limit exceeded: throttle agent execution rate (reject requests above limit with `THROTTLED` response)
  - Notify tenant administrator via configured notification channel on throttle activation
  - _Requirements: 12.7_

- [ ] 90. Implement tenant onboarding API
  - Implement REST API endpoints: `POST /tenants` (create tenant, trigger provisioning workflow), `GET /tenants/{id}/status` (provisioning status), `GET /tenants/{id}/health` (component health)
  - Wire `POST /tenants` to `TenantProvisioningWorkflow` (task 5)
  - Return provisioning status with step-by-step progress (5 steps, ≤15 min total)
  - _Requirements: 12.3_

- [ ]* 90.1 Write property test for tenant provisioning latency
  - **Property 40: Tenant Provisioning Latency** — tenant environment must be fully operational within 15 minutes of provisioning request; all agents running, Kafka topics created, namespace isolated
  - **Validates: Requirements 12.3**

- [ ] 91. Implement Helm chart structure for multi-cloud deployment
  - Create `echo-platform/` Helm chart with `Chart.yaml`, `values.yaml`, `values-aws.yaml`, `values-azure.yaml`, `values-gcp.yaml`
  - Create deployment templates for all 15 microservices: `agent-orchestrator`, `reasoning-engine`, `execution-engine`, `ingestion-service`, `protocol-layer`, `liquid-ledger`, `roi-engine`, `command-center-api`, `command-center-ui`, `tenant-provisioner`, `auditor-agent`, `governor-agent`, `green-architect-agent`, `finance-agent`, `contract-twin-service`
  - Create `NetworkPolicy` templates (deny all cross-namespace traffic)
  - Create `RBAC` templates (namespace-scoped ServiceAccounts)
  - Create `ConfigMap` and `Secret` templates (referencing cloud KMS)
  - _Requirements: 12.1_

- [ ] 92. Implement HorizontalPodAutoscaler configs
  - Create HPA for `agent-orchestrator`: scale on CPU utilization and Kafka consumer lag
  - Create HPA for `execution-engine`: scale on queue depth in `execution.tasks` Kafka topic
  - Create HPA for `reasoning-engine`: scale on queue depth in `reasoning.tasks` Kafka topic
  - Configure min/max replicas and scale-up/scale-down stabilization windows
  - _Requirements: 12.4_

- [ ] 93. Implement disaster recovery configuration
  - Configure Kafka replication: 3 brokers, replication factor 3, min ISR 2 (RPO ≤5 min)
  - Configure PostgreSQL streaming replication to secondary region
  - Configure Liquid_Ledger (Cassandra) cross-region active-passive replication with integrity verification on failover
  - Configure automated failover via Kubernetes health checks (RTO ≤30 min)
  - Configure daily snapshots to object storage with 7-year retention
  - _Requirements: 9.3, 12.1_

- [ ] 94. Implement load testing suite
  - Write k6 or Gatling load test simulating 10,000 concurrent agent events per second across all tenants
  - Assert p99 event processing latency < 2 seconds under peak load
  - Include ramp-up profile: 0 → 10,000 events/sec over 5 minutes, sustain for 10 minutes
  - _Requirements: 12.5_

- [ ]* 94.1 Write property test for peak load latency
  - **Property 41: Peak Load Latency** — at or below 10,000 concurrent agent events per second, p99 event processing latency must be <2 seconds
  - **Validates: Requirements 12.5**

- [ ] 95. Implement chaos testing suite
  - Write chaos test: kill individual agent pods → verify failover within 30s → verify no data loss in Liquid_Ledger
  - Write chaos test: kill Kafka broker → verify circuit breaker opens → verify events buffered locally → verify recovery on broker restart
  - Write chaos test: two tenants, cross-tenant data access attempt → verify all attempts blocked (Property 18)
  - _Requirements: 5.4, 12.2_

- [ ] 96. Implement end-to-end integration test: billing event → anomaly → reasoning → execution → ledger
  - Deploy all services in a test Kubernetes namespace
  - Inject synthetic `BillingEvent` with anomalous spend pattern
  - Assert: `CostLeakageEvent` emitted within 10s → routed to Reasoning_Engine → `ProposedAction` generated → simulation run → `ScoredAction` produced → approval routing applied → execution (or human review queue) → `LedgerEntry` written
  - Assert: cost impact math present on `ProposedAction`
  - _Requirements: 1.2, 3.1, 9.1_

- [ ] 97. Implement cross-agent workflow integration test
  - Inject anomaly event → Auditor_Agent detects → Finance_Agent calculates ROI → Execution_Engine executes → Liquid_Ledger records
  - Assert: A2A coordination completes within 2 seconds between agents
  - Assert: ROI formula applied correctly end-to-end
  - Assert: all four ledger entry types present (anomaly, action, execution, ROI)
  - _Requirements: 5.2, 10.1, 9.1_

- [ ] 98. Implement SLA breach prevention end-to-end integration test
  - Inject metric approaching SLA threshold (within 10%) → assert `PreBreachWarningEvent` emitted before threshold crossed → assert Governor_Agent routes remediation action → assert breach avoided
  - Assert: penalty math attached to pre-breach warning
  - Assert: if breach occurs, ledger entry written within 60s
  - _Requirements: 7.2, 7.4_

- [ ] 99. Implement kill-switch end-to-end integration test
  - Simulate DoW limit exceeded → assert kill-switch auto-activates → assert all agents halt within 5s → assert ledger records activation with user identity and timestamp
  - Simulate manual kill-switch from Command_Center → assert same halt and ledger behavior
  - _Requirements: 4.1, 4.2, 4.4_

- [ ] 100. Implement multi-tenant isolation integration test
  - Create two tenants (T1, T2) in test namespace
  - Attempt cross-tenant data access from T1 agent to T2 billing events, ledger entries, and actions
  - Assert all cross-tenant access attempts are blocked at storage, network, and agent execution layers
  - Assert no T1 data appears in T2 queries and vice versa
  - _Requirements: 5.5, 12.2_

- [ ] 101. Final checkpoint — All systems integrated and verified
  - Run full end-to-end test suite across all 17 phases
  - Verify all property-based tests pass (Properties 1–58)
  - Verify load test: p99 < 2s at 10,000 events/sec
  - Verify chaos tests: failover within 30s, no data loss
  - Verify multi-tenant isolation: all cross-tenant access blocked
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each phase boundary
- Property tests validate universal correctness properties across thousands of generated inputs (minimum 100 iterations per property per design spec)
- Unit tests validate specific examples, integration points, and error conditions
- The four agent archetypes map to tasks as follows:
  - Spend Intelligence Agent → tasks 20–25 (Auditor_Agent)
  - SLA and Penalty Prevention Agent → tasks 27–32 (Governor_Agent + Contract_Digital_Twin)
  - Resource Optimization Agent → tasks 34–41 (Auditor_Agent extended + Execution_Engine)
  - Financial Operations Agent → tasks 43–48 (Finance_Agent + ROI_Engine)
- Every agent archetype includes a "show the math" sub-task implementing quantifiable cost impact calculation
- Property-based tests use `fast-check` (TypeScript); each test tagged with property number and requirements clause
