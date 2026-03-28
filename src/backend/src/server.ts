import express from "express";
import cors from "cors";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  agents, costLeakageEvents, actions, roiSummary, a2aMessages,
  carbonSummary, governanceReport, modelPerformance, state,
  generateLeakageEvent, generateA2AMessage, generateAgentHealthUpdate,
} from "./mockData";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// ── Try to load real engine (graceful fallback if imports fail) ───────────────
let engine: typeof import("./engine") | null = null;
(async () => {
  try {
    engine = await import("./engine");
    console.log("[ENGINE] Real ECHO engine loaded successfully");
  } catch (err) {
    console.warn("[ENGINE] Running in mock-only mode:", (err as Error).message);
  }
})();

// ── WebSocket ─────────────────────────────────────────────────────────────────

interface EchoClient { ws: WebSocket; tenantId: string; alive: boolean; }
const clients = new Map<string, EchoClient>();

function broadcast(tenantId: string, type: string, payload: unknown) {
  const msg = JSON.stringify({ type, payload, timestamp: new Date().toISOString(), tenantId });
  for (const client of clients.values()) {
    if (client.tenantId === tenantId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(msg);
    }
  }
}
function broadcastAll(type: string, payload: unknown) { broadcast("tenant-acme", type, payload); }

wss.on("connection", (ws, req) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const tenantId = url.searchParams.get("tenant_id") ?? "tenant-acme";
  const clientId = uuidv4();
  const client: EchoClient = { ws, tenantId, alive: true };
  clients.set(clientId, client);
  console.log("[WS] Client connected:", clientId, "tenant:", tenantId);

  ws.send(JSON.stringify({
    type: "INITIAL_SNAPSHOT",
    payload: {
      agents,
      costLeakageEvents: costLeakageEvents.slice(0, 10),
      actions,
      roiSummary,
      a2aMessages: a2aMessages.slice(0, 15),
      carbonSummary,
      governanceReport,
      modelPerformance,
      dowConfig: state.dowConfig,
      killSwitchActive: state.killSwitchActive,
      engineStatus: engine ? engine.getEngineStatus(tenantId) : null,
    },
    timestamp: new Date().toISOString(),
    tenantId,
  }));

  ws.on("pong", () => { client.alive = true; });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString()) as { type: string; payload: unknown };

      if (msg.type === "APPROVE_ACTION") {
        const { actionId } = msg.payload as { actionId: string };
        const a = actions.find(x => x.actionId === actionId);
        if (a) { a.approvalState = "APPROVED"; broadcast(tenantId, "ACTION_UPDATE", a); }

      } else if (msg.type === "REJECT_ACTION") {
        const { actionId } = msg.payload as { actionId: string };
        const a = actions.find(x => x.actionId === actionId);
        if (a) { a.approvalState = "REJECTED"; broadcast(tenantId, "ACTION_UPDATE", a); }

      } else if (msg.type === "ACTIVATE_KILL_SWITCH") {
        state.killSwitchActive = true;
        if (engine) {
          engine.killSwitch.activate(tenantId, "operator", []).catch(console.error);
        }
        broadcast(tenantId, "KILL_SWITCH_EVENT", { active: true });

      } else if (msg.type === "DEACTIVATE_KILL_SWITCH") {
        state.killSwitchActive = false;
        broadcast(tenantId, "KILL_SWITCH_EVENT", { active: false });

      } else if (msg.type === "RUN_ANOMALY_DETECTION") {
        const { resourceId, hourlyCostUsd } = msg.payload as { resourceId: string; hourlyCostUsd: number };
        if (engine) {
          engine.runAnomalyDetection(tenantId, resourceId, hourlyCostUsd).then(result => {
            broadcast(tenantId, "ANOMALY_RESULT", result);
          }).catch(console.error);
        }

      } else if (msg.type === "ROUTE_REASONING") {
        const { riskScore, financialImpact } = msg.payload as { riskScore: number; financialImpact: number };
        if (engine) {
          engine.routeReasoning(tenantId, riskScore, financialImpact).then(result => {
            broadcast(tenantId, "REASONING_RESULT", result);
          }).catch(console.error);
        }
      }
    } catch { /* ignore malformed */ }
  });

  ws.on("close", () => { clients.delete(clientId); });
  ws.on("error", () => { clients.delete(clientId); });
});

const heartbeat = setInterval(() => {
  for (const [id, c] of clients.entries()) {
    if (!c.alive) { c.ws.terminate(); clients.delete(id); continue; }
    c.alive = false; c.ws.ping();
  }
}, 30000);
wss.on("close", () => clearInterval(heartbeat));

// ── REST API ──────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    clients: clients.size,
    engine: engine ? "loaded" : "mock-only",
    timestamp: new Date().toISOString(),
  });
});

// Agents
app.get("/api/agents", (_req, res) => res.json(agents));
app.get("/api/agents/:id", (req, res) => {
  const a = agents.find(x => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  return res.json(a);
});

// Cost leakage
app.get("/api/cost-leakage", (_req, res) => res.json(costLeakageEvents));

// Actions
app.get("/api/actions", (_req, res) => res.json(actions));
app.patch("/api/actions/:id/approve", (req, res) => {
  const a = actions.find(x => x.actionId === req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  a.approvalState = "APPROVED";
  broadcastAll("ACTION_UPDATE", a);
  return res.json(a);
});
app.patch("/api/actions/:id/reject", (req, res) => {
  const a = actions.find(x => x.actionId === req.params.id);
  if (!a) return res.status(404).json({ error: "Not found" });
  a.approvalState = "REJECTED";
  broadcastAll("ACTION_UPDATE", a);
  return res.json(a);
});

// ROI
app.get("/api/roi", (_req, res) => res.json(roiSummary));
app.post("/api/roi/calculate", (req, res) => {
  if (!engine) return res.status(503).json({ error: "Engine not loaded" });
  const { cost_savings_usd, execution_cost_usd, reasoning_cost_usd, avoided_loss_usd, platform_cost_usd } =
    req.body as Record<string, number>;
  try {
    const result = engine.roiEngine.calculate({
      cost_savings_usd: cost_savings_usd ?? 0,
      execution_cost_usd: execution_cost_usd ?? 0,
      reasoning_cost_usd: reasoning_cost_usd ?? 0,
      avoided_loss_usd: avoided_loss_usd ?? 0,
      platform_cost_usd: platform_cost_usd ?? 1,
    });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

// A2A messages
app.get("/api/a2a-messages", (_req, res) => res.json(a2aMessages));

// Carbon
app.get("/api/carbon", (_req, res) => res.json(carbonSummary));

// Governance
app.get("/api/governance/report", (_req, res) => res.json(governanceReport));
app.get("/api/governance/dow", (_req, res) => res.json(state.dowConfig));
app.patch("/api/governance/dow", (req, res) => {
  const b = req.body as { dailySpendLimitUsd?: number; alertThresholdPct?: number };
  if (b.dailySpendLimitUsd !== undefined) state.dowConfig.dailySpendLimitUsd = b.dailySpendLimitUsd;
  if (b.alertThresholdPct !== undefined) state.dowConfig.alertThresholdPct = b.alertThresholdPct;
  broadcastAll("DOW_CONFIG_UPDATE", state.dowConfig);
  res.json(state.dowConfig);
});

app.post("/api/governance/kill-switch/activate", (req, res) => {
  const { userId } = req.body as { userId?: string };
  state.killSwitchActive = true;
  if (engine) {
    engine.killSwitch.activate("tenant-acme", userId ?? "api-user", []).catch(console.error);
  }
  broadcastAll("KILL_SWITCH_EVENT", { active: true, activatedBy: userId ?? "api-user" });
  res.json({ success: true, active: true });
});

app.post("/api/governance/kill-switch/deactivate", (_req, res) => {
  state.killSwitchActive = false;
  broadcastAll("KILL_SWITCH_EVENT", { active: false });
  res.json({ success: true, active: false });
});

// Models
app.get("/api/models", (_req, res) => res.json(modelPerformance));

// Engine status
app.get("/api/engine/status", (req, res) => {
  const tenantId = (req.query.tenant_id as string) ?? "tenant-acme";
  if (!engine) return res.json({ engine: "mock-only" });
  return res.json(engine.getEngineStatus(tenantId));
});

// Ledger
app.get("/api/ledger", (req, res) => {
  if (!engine) return res.json([]);
  const tenantId = (req.query.tenant_id as string) ?? "tenant-acme";
  const entries = engine.ledger.query(tenantId, {
    action_type: req.query.action_type as string | undefined,
    agent_id: req.query.agent_id as string | undefined,
  });
  return res.json(entries.slice(-100)); // last 100
});

app.get("/api/ledger/integrity", (req, res) => {
  if (!engine) return res.json({ valid: true, engine: "mock-only" });
  const tenantId = (req.query.tenant_id as string) ?? "tenant-acme";
  const all = engine.ledger.getAll(tenantId);
  if (all.length === 0) return res.json({ valid: true, checked_count: 0 });
  const result = engine.ledger.verifyIntegrity(tenantId, 1, all.length);
  return res.json(result);
});

// Anomaly detection
app.post("/api/anomaly/detect", async (req, res) => {
  if (!engine) return res.status(503).json({ error: "Engine not loaded" });
  const { tenantId, resourceId, hourlyCostUsd } = req.body as Record<string, string | number>;
  const result = await engine.runAnomalyDetection(
    (tenantId as string) ?? "tenant-acme",
    (resourceId as string) ?? "res-1",
    Number(hourlyCostUsd) ?? 1.0,
  );
  return res.json(result);
});

// Reasoning routing
app.post("/api/reasoning/route", async (req, res) => {
  if (!engine) return res.status(503).json({ error: "Engine not loaded" });
  const { tenantId, riskScore, financialImpact } = req.body as Record<string, string | number>;
  const result = await engine.routeReasoning(
    (tenantId as string) ?? "tenant-acme",
    Number(riskScore) ?? 30,
    Number(financialImpact) ?? 5000,
  );
  return res.json(result);
});

// SLA contracts
app.post("/api/sla/contracts", (req, res) => {
  if (!engine) return res.status(503).json({ error: "Engine not loaded" });
  try {
    const model = engine.contractTwin.ingestContract(req.body);
    return res.json(model);
  } catch (err) {
    return res.status(400).json({ error: (err as Error).message });
  }
});

app.get("/api/sla/contracts", (_req, res) => {
  if (!engine) return res.json([]);
  return res.json(engine.contractTwin.getAllModels());
});

// Security — API keys
app.post("/api/security/api-keys", (req, res) => {
  if (!engine) return res.status(503).json({ error: "Engine not loaded" });
  const { tenantId, role } = req.body as { tenantId: string; role: string };
  const { key, metadata } = engine.apiKeyManager.generate(tenantId, role as any);
  return res.json({ key, metadata });
});

// ── Live event simulation ─────────────────────────────────────────────────────

setInterval(() => {
  const e = generateLeakageEvent();
  costLeakageEvents.unshift(e);
  if (costLeakageEvents.length > 100) costLeakageEvents.pop();
  broadcastAll("COST_LEAKAGE_EVENT", e);

  // Also run real anomaly detection if engine is loaded
  if (engine) {
    engine.runAnomalyDetection("tenant-acme", e.resourceId, e.hourlyCostUsd)
      .then(result => {
        if (result.triggered) {
          broadcastAll("ANOMALY_DETECTED", result);
        }
      })
      .catch(() => {});
  }
}, 8000);

setInterval(() => {
  const m = generateA2AMessage();
  a2aMessages.unshift(m);
  if (a2aMessages.length > 100) a2aMessages.pop();
  broadcastAll("A2A_MESSAGE", m);
}, 5000);

setInterval(() => {
  const u = generateAgentHealthUpdate();
  const ag = agents.find(a => a.id === u.id);
  if (ag) {
    ag.healthScore = u.healthScore;
    ag.reasoningAccuracy = u.reasoningAccuracy;
    ag.actionsToday = u.actionsToday;
    ag.lastActionTs = new Date().toISOString();
    broadcastAll("AGENT_HEALTH_UPDATE", {
      id: ag.id,
      healthScore: ag.healthScore,
      reasoningAccuracy: ag.reasoningAccuracy,
      actionsToday: ag.actionsToday,
      lastActionTs: ag.lastActionTs,
    });
  }
}, 10000);

setInterval(() => {
  roiSummary.totalSavingsUsd += Math.random() * 500 + 100;
  roiSummary.cumulativeRoi = parseFloat(
    ((roiSummary.totalSavingsUsd / roiSummary.platformCostUsd) * 100).toFixed(1),
  );
  broadcastAll("ROI_UPDATE", roiSummary);
}, 30000);

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = Number(process.env.PORT ?? 8080);
server.listen(PORT, () => {
  console.log(`\nECHO Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`Frontend:  http://localhost:3000`);
  console.log(`\nAPI endpoints:`);
  console.log(`  GET  /api/health`);
  console.log(`  GET  /api/agents`);
  console.log(`  GET  /api/actions`);
  console.log(`  GET  /api/roi`);
  console.log(`  POST /api/roi/calculate`);
  console.log(`  GET  /api/ledger`);
  console.log(`  GET  /api/ledger/integrity`);
  console.log(`  POST /api/anomaly/detect`);
  console.log(`  POST /api/reasoning/route`);
  console.log(`  POST /api/sla/contracts`);
  console.log(`  GET  /api/engine/status`);
  console.log(`  POST /api/governance/kill-switch/activate`);
});
