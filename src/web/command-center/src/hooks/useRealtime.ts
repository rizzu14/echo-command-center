import { useEffect } from 'react';
import { useEchoStore } from '../store';
import type { CostLeakageEvent, A2AMessage, AnomalyCategory } from '../types';

// Simulates real-time data updates when no WebSocket backend is available
export function useRealtime() {
  const { addCostLeakageEvent, addA2AMessage, updateAgent } = useEchoStore.getState();
  const wsConnected = useEchoStore((s) => s.wsConnected);

  useEffect(() => {
    // Only simulate if not connected to real WebSocket
    if (wsConnected) return;

    const categories: AnomalyCategory[] = ['IDLE', 'OVER_PROVISIONED', 'ORPHANED', 'USAGE_SPIKE'];
    const providers = ['AWS', 'Azure', 'GCP'] as const;
    const regions = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'us-west-2', 'eastus'];
    const agentTypes = ['AUDITOR', 'GOVERNOR', 'GREEN_ARCHITECT', 'FINANCE'] as const;
    const taskTypes = ['ANOMALY_DETECTED', 'ACTION_PROPOSED', 'GOVERNANCE_CHECK', 'ROI_CALCULATION'] as const;

    let eventCounter = 100;

    const leakageInterval = setInterval(() => {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const provider = providers[Math.floor(Math.random() * providers.length)];
      const region = regions[Math.floor(Math.random() * regions.length)];
      const hourlyCost = parseFloat((Math.random() * 20 + 0.5).toFixed(2));

      const event: CostLeakageEvent = {
        eventId: `evt-sim-${++eventCounter}`,
        tenantId: 'tenant-acme',
        resourceId: `resource-${Math.random().toString(36).slice(2, 10)}`,
        anomalyCategory: category,
        hourlyCostUsd: hourlyCost,
        detectionTs: new Date().toISOString(),
        costImpactMath: `$${hourlyCost}/hr × 720 hrs = $${(hourlyCost * 720).toFixed(0)}/mo`,
        region,
        provider,
      };

      addCostLeakageEvent(event);
    }, 8000);

    const messageInterval = setInterval(() => {
      const from = agentTypes[Math.floor(Math.random() * agentTypes.length)];
      let to = agentTypes[Math.floor(Math.random() * agentTypes.length)];
      while (to === from) to = agentTypes[Math.floor(Math.random() * agentTypes.length)];
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];

      const message: A2AMessage = {
        messageId: `msg-sim-${++eventCounter}`,
        fromAgent: from,
        toAgent: to,
        taskType,
        timestamp: new Date().toISOString(),
        payloadPreview: `Simulated ${taskType.toLowerCase().replace(/_/g, ' ')} message`,
        latencyMs: Math.floor(Math.random() * 200 + 20),
      };

      addA2AMessage(message);
    }, 5000);

    // Simulate agent health fluctuations
    const healthInterval = setInterval(() => {
      const agentIds = ['agent-auditor', 'agent-governor', 'agent-green', 'agent-finance'];
      const id = agentIds[Math.floor(Math.random() * agentIds.length)];
      updateAgent(id, {
        healthScore: Math.floor(Math.random() * 10 + 90),
        reasoningAccuracy: parseFloat((Math.random() * 5 + 92).toFixed(1)),
      });
    }, 10000);

    return () => {
      clearInterval(leakageInterval);
      clearInterval(messageInterval);
      clearInterval(healthInterval);
    };
  }, [wsConnected, addCostLeakageEvent, addA2AMessage, updateAgent]);
}
