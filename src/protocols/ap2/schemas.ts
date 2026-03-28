// ─── AP2 Protocol Schemas ─────────────────────────────────────────────────────
// Agent Payment Protocol — governs financial transactions initiated by agents

export type AP2TransactionType =
  | 'RESOURCE_PURCHASE'
  | 'RESOURCE_TERMINATION'
  | 'SCALING_ACTION'
  | 'VENDOR_PAYMENT'
  | 'REMEDIATION_ACTION';

export type TransactionStatus =
  | 'PENDING'
  | 'GOVERNOR_APPROVED'
  | 'GOVERNOR_REJECTED'
  | 'SUBMITTED'
  | 'COMPLETED'
  | 'FAILED'
  | 'MANDATE_EXCEEDED';

/**
 * SpendingMandate — defines the financial authority granted to an agent.
 */
export interface SpendingMandate {
  mandate_id: string;
  tenant_id: string;
  agent_id: string;
  max_amount_usd: number;
  allowed_action_types: AP2TransactionType[];
  valid_from: string;           // ISO-8601
  valid_until: string;          // ISO-8601
  requires_governor_approval: boolean;
  cumulative_spent_usd: number; // running total within validity window
}

/**
 * AgentWallet — tracks an agent's financial authority and spending history.
 */
export interface AgentWallet {
  wallet_id: string;
  agent_id: string;
  tenant_id: string;
  active_mandate: SpendingMandate | null;
  total_spent_usd: number;
  transaction_count: number;
  last_transaction_at: string | null; // ISO-8601
}

/**
 * W3C Verifiable Credential (minimal structure for verification).
 * https://www.w3.org/TR/vc-data-model/
 */
export interface W3CVerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  issuer: string;
  issuanceDate: string;         // ISO-8601
  expirationDate?: string;      // ISO-8601
  credentialSubject: {
    id: string;
    [key: string]: unknown;
  };
  proof?: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
}

/**
 * AP2Transaction — a financial transaction initiated by an agent.
 */
export interface AP2Transaction {
  transaction_id: string;
  tenant_id: string;
  initiating_agent: string;
  transaction_type: AP2TransactionType;
  amount_usd: number;
  target_resource: string;
  spending_mandate: SpendingMandate;
  w3c_credential: W3CVerifiableCredential;
  status: TransactionStatus;
  governor_validation_ts?: string;  // ISO-8601 — must precede submission_ts (Req 5.6)
  submission_ts?: string;           // ISO-8601
  created_at: string;               // ISO-8601
}

/**
 * ValidationResult — outcome of Governor_Agent transaction validation.
 */
export interface ValidationResult {
  valid: boolean;
  transaction_id: string;
  validated_at: string;   // ISO-8601
  reason?: string;
}

// ─── Validation helpers ───────────────────────────────────────────────────────

export function isAP2Transaction(obj: unknown): obj is AP2Transaction {
  if (typeof obj !== 'object' || obj === null) return false;
  const t = obj as Record<string, unknown>;
  return (
    typeof t['transaction_id'] === 'string' &&
    typeof t['tenant_id'] === 'string' &&
    typeof t['initiating_agent'] === 'string' &&
    typeof t['transaction_type'] === 'string' &&
    typeof t['amount_usd'] === 'number' &&
    typeof t['target_resource'] === 'string' &&
    typeof t['spending_mandate'] === 'object' &&
    t['spending_mandate'] !== null &&
    typeof t['w3c_credential'] === 'object' &&
    t['w3c_credential'] !== null &&
    typeof t['status'] === 'string' &&
    typeof t['created_at'] === 'string'
  );
}

export function isSpendingMandate(obj: unknown): obj is SpendingMandate {
  if (typeof obj !== 'object' || obj === null) return false;
  const m = obj as Record<string, unknown>;
  return (
    typeof m['mandate_id'] === 'string' &&
    typeof m['tenant_id'] === 'string' &&
    typeof m['agent_id'] === 'string' &&
    typeof m['max_amount_usd'] === 'number' &&
    Array.isArray(m['allowed_action_types']) &&
    typeof m['valid_from'] === 'string' &&
    typeof m['valid_until'] === 'string' &&
    typeof m['requires_governor_approval'] === 'boolean' &&
    typeof m['cumulative_spent_usd'] === 'number'
  );
}

export function isW3CVerifiableCredential(obj: unknown): obj is W3CVerifiableCredential {
  if (typeof obj !== 'object' || obj === null) return false;
  const c = obj as Record<string, unknown>;
  return (
    Array.isArray(c['@context']) &&
    Array.isArray(c['type']) &&
    typeof c['id'] === 'string' &&
    typeof c['issuer'] === 'string' &&
    typeof c['issuanceDate'] === 'string' &&
    typeof c['credentialSubject'] === 'object' &&
    c['credentialSubject'] !== null
  );
}
