import { createHmac, randomUUID } from 'crypto';
import {
  A2AMessage,
  A2ARequest,
  A2AResponse,
  AgentCard,
  TrustNegotiationResult,
  TrustLevel,
  isA2AMessage,
  isAgentCard,
} from './schemas.js';

// ─── Constants ────────────────────────────────────────────────────────────────

/** A2A coordination must complete within 2 seconds (Req 5.2) */
const COORDINATION_TIMEOUT_MS = 2000;

// ─── A2AHandler ───────────────────────────────────────────────────────────────

/**
 * Handles Agent-to-Agent (A2A) protocol messages.
 * Implements HMAC-SHA256 signing, trust negotiation, and message delegation.
 *
 * Requirements: 6.2, 5.2
 */
export class A2AHandler {
  private readonly agentCard: AgentCard;
  private readonly hmacSecret: string;
  private readonly trustedAgents: Map<string, AgentCard> = new Map();

  constructor(agentCard: AgentCard, hmacSecret: string) {
    this.agentCard = agentCard;
    this.hmacSecret = hmacSecret;
  }

  // ─── send ─────────────────────────────────────────────────────────────────

  /**
   * Create and sign an outbound A2A message.
   */
  send(request: A2ARequest): A2AMessage {
    const message: Omit<A2AMessage, 'signature'> = {
      message_id: randomUUID(),
      from_agent: this.agentCard.agent_id,
      to_agent: request.to_agent,
      tenant_id: request.tenant_id,
      task_type: request.task_type,
      payload: request.payload,
      correlation_id: request.request_id,
      timestamp: new Date().toISOString(),
    };

    const signature = this.sign(message);
    return { ...message, signature };
  }

  // ─── receive ──────────────────────────────────────────────────────────────

  /**
   * Parse and verify an incoming A2A message.
   * Returns null if the message is invalid or signature verification fails.
   */
  receive(raw: string): ReceiveResult {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'Invalid JSON' };
    }

    if (!isA2AMessage(parsed)) {
      return { ok: false, error: 'Schema validation failed: not a valid A2AMessage' };
    }

    const message = parsed as A2AMessage;

    // Verify tenant isolation — message must be for our tenant
    if (message.tenant_id !== this.agentCard.tenant_id) {
      return { ok: false, error: `Tenant mismatch: expected ${this.agentCard.tenant_id}` };
    }

    // Verify HMAC signature
    const { signature, ...body } = message;
    const expectedSig = this.sign(body);
    if (!timingSafeEqual(signature, expectedSig)) {
      return { ok: false, error: 'Signature verification failed' };
    }

    return { ok: true, message };
  }

  // ─── negotiate ────────────────────────────────────────────────────────────

  /**
   * Negotiate trust with another agent.
   * Internal agents (same tenant) share a tenant-scoped trust anchor.
   * External agents require explicit Platform Administrator grant.
   */
  negotiate(remoteCard: AgentCard): TrustNegotiationResult {
    if (!isAgentCard(remoteCard)) {
      return { accepted: false, trust_level: 'untrusted', reason: 'Invalid AgentCard' };
    }

    // Internal agents: same tenant → share trust anchor
    if (remoteCard.tenant_id === this.agentCard.tenant_id) {
      const anchor = this.computeTrustAnchor(this.agentCard.tenant_id);
      this.trustedAgents.set(remoteCard.agent_id, remoteCard);
      return {
        accepted: true,
        trust_level: 'internal',
        shared_anchor: anchor,
      };
    }

    // External agents: require explicit platform-level trust
    if (remoteCard.trust_level === 'platform-trusted') {
      this.trustedAgents.set(remoteCard.agent_id, remoteCard);
      return {
        accepted: true,
        trust_level: 'platform-trusted',
      };
    }

    return {
      accepted: false,
      trust_level: 'untrusted',
      reason: 'External agent requires explicit Platform Administrator grant',
    };
  }

  // ─── delegate ─────────────────────────────────────────────────────────────

  /**
   * Delegate a task to another agent by creating a delegation message.
   */
  delegate(
    toAgentId: string,
    taskType: A2ARequest['task_type'],
    payload: Record<string, unknown>,
  ): A2AMessage {
    return this.send({
      request_id: randomUUID(),
      from_agent: this.agentCard.agent_id,
      to_agent: toAgentId,
      tenant_id: this.agentCard.tenant_id,
      task_type: taskType,
      payload: { ...payload, delegated: true, delegated_by: this.agentCard.agent_id },
    });
  }

  // ─── serialize / parse ────────────────────────────────────────────────────

  serialize(message: A2AMessage): string {
    return JSON.stringify(message, null, 2);
  }

  parse(raw: string): A2AMessage | null {
    const result = this.receive(raw);
    return result.ok ? result.message : null;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private sign(body: Omit<A2AMessage, 'signature'>): string {
    const canonical = JSON.stringify(body, Object.keys(body).sort());
    return createHmac('sha256', this.hmacSecret).update(canonical).digest('hex');
  }

  private computeTrustAnchor(tenantId: string): string {
    return createHmac('sha256', this.hmacSecret).update(`trust-anchor:${tenantId}`).digest('hex');
  }
}

// ─── A2ACoordinator ───────────────────────────────────────────────────────────

/**
 * Coordinates inter-agent requests within the Agent_Orchestrator.
 * Must complete coordination within 2 seconds (Req 5.2).
 */
export class A2ACoordinator {
  private readonly handlers: Map<string, A2AHandler> = new Map();
  private readonly pendingRequests: Map<string, PendingRequest> = new Map();

  registerAgent(agentId: string, handler: A2AHandler): void {
    this.handlers.set(agentId, handler);
  }

  /**
   * Coordinate an inter-agent request.
   * Resolves within COORDINATION_TIMEOUT_MS (2 seconds).
   */
  async coordinate(request: A2ARequest): Promise<A2AResponse> {
    const start = Date.now();

    const fromHandler = this.handlers.get(request.from_agent);
    if (!fromHandler) {
      return this.errorResponse(request, 'Sender agent not registered', Date.now() - start);
    }

    const toHandler = this.handlers.get(request.to_agent);
    if (!toHandler) {
      return this.errorResponse(request, 'Target agent not registered', Date.now() - start);
    }

    // Sign and serialize the message
    const message = fromHandler.send(request);
    const serialized = fromHandler.serialize(message);

    // Deliver to target agent with timeout
    const deliveryPromise = this.deliver(request.to_agent, serialized, toHandler);
    const timeoutPromise = new Promise<A2AResponse>((_, reject) =>
      setTimeout(() => reject(new Error('Coordination timeout')), COORDINATION_TIMEOUT_MS),
    );

    try {
      const result = await Promise.race([deliveryPromise, timeoutPromise]);
      return { ...result, latency_ms: Date.now() - start };
    } catch (err) {
      return this.errorResponse(
        request,
        err instanceof Error ? err.message : 'Coordination failed',
        Date.now() - start,
      );
    }
  }

  private async deliver(
    toAgentId: string,
    serialized: string,
    handler: A2AHandler,
  ): Promise<A2AResponse> {
    const received = handler.receive(serialized);
    if (!received.ok) {
      throw new Error(`Delivery failed: ${received.error}`);
    }
    // In production, this would invoke the agent's task handler.
    // Here we return a successful delivery acknowledgement.
    return {
      request_id: received.message!.correlation_id,
      from_agent: toAgentId,
      to_agent: received.message!.from_agent,
      tenant_id: received.message!.tenant_id,
      success: true,
      result: { delivered: true, message_id: received.message!.message_id },
      latency_ms: 0,
    };
  }

  private errorResponse(request: A2ARequest, error: string, latency_ms: number): A2AResponse {
    return {
      request_id: request.request_id,
      from_agent: request.from_agent,
      to_agent: request.to_agent,
      tenant_id: request.tenant_id,
      success: false,
      error,
      latency_ms,
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ReceiveResult =
  | { ok: true; message: A2AMessage; error?: never }
  | { ok: false; error: string; message?: never };

interface PendingRequest {
  request: A2ARequest;
  resolve: (response: A2AResponse) => void;
  reject: (err: Error) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Constant-time string comparison to prevent timing attacks */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
