import { useEffect, useRef, useCallback } from 'react';
import { useEchoStore } from '../store';
import type { WsEvent, CostLeakageEvent, Agent, Action, A2AMessage, ROISummary, CarbonSummary, GovernanceReport, ModelPerformance, DoWConfig } from '../types';

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;

interface InitialSnapshot {
  agents: Agent[];
  costLeakageEvents: CostLeakageEvent[];
  actions: Action[];
  roiSummary: ROISummary;
  a2aMessages: A2AMessage[];
  carbonSummary: CarbonSummary;
  governanceReport: GovernanceReport;
  modelPerformance: ModelPerformance[];
  dowConfig: DoWConfig;
  killSwitchActive: boolean;
}

export function useWebSocket(tenantId: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);
  const mountedRef = useRef(true);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const wsEvent = JSON.parse(event.data as string) as { type: string; payload: unknown };
      const store = useEchoStore.getState();

      switch (wsEvent.type) {
        case 'INITIAL_SNAPSHOT': {
          const snap = wsEvent.payload as InitialSnapshot;
          store.setAgents(snap.agents);
          store.setActions(snap.actions);
          store.setROISummary(snap.roiSummary);
          store.setCarbonSummary(snap.carbonSummary);
          store.setGovernanceReport(snap.governanceReport);
          store.setModelPerformance(snap.modelPerformance);
          store.setDoWConfig(snap.dowConfig);
          store.setKillSwitchActive(snap.killSwitchActive);
          // Prepend live events to existing mock data
          snap.costLeakageEvents.forEach(e => store.addCostLeakageEvent(e));
          snap.a2aMessages.forEach(m => store.addA2AMessage(m));
          break;
        }
        case 'COST_LEAKAGE_EVENT':
          store.addCostLeakageEvent(wsEvent.payload as CostLeakageEvent);
          break;
        case 'AGENT_HEALTH_UPDATE': {
          const agent = wsEvent.payload as Partial<Agent> & { id: string };
          store.updateAgent(agent.id, agent);
          break;
        }
        case 'ACTION_UPDATE': {
          const action = wsEvent.payload as Partial<Action> & { actionId: string };
          store.updateAction(action.actionId, action);
          break;
        }
        case 'A2A_MESSAGE':
          store.addA2AMessage(wsEvent.payload as A2AMessage);
          break;
        case 'ROI_UPDATE':
          store.setROISummary(wsEvent.payload as ROISummary);
          break;
        case 'KILL_SWITCH_EVENT': {
          const ks = wsEvent.payload as { active: boolean };
          store.setKillSwitchActive(ks.active);
          break;
        }
        case 'DOW_CONFIG_UPDATE':
          store.setDoWConfig(wsEvent.payload as DoWConfig);
          break;
        default:
          break;
      }
    } catch {
      // Ignore malformed messages
    }
  }, []);

  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080';
  const wsBase = backendUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
  const wsUrl = `${wsBase}/ws?tenant_id=${tenantId}`;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        attemptRef.current = 0;
        useEchoStore.getState().setWsConnected(true);
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        if (!mountedRef.current) return;
        useEchoStore.getState().setWsConnected(false);
        wsRef.current = null;
        const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, attemptRef.current), MAX_BACKOFF_MS);
        attemptRef.current += 1;
        reconnectTimerRef.current = setTimeout(connect, backoff);
      };

      ws.onerror = () => { ws.close(); };
    } catch {
      useEchoStore.getState().setWsConnected(false);
    }
  }, [tenantId, handleMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const connected = useEchoStore((s) => s.wsConnected);
  return { connected, send };
}
