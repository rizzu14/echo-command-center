import { randomUUID } from 'crypto';
import {
  AP2Transaction,
  AgentWallet,
  SpendingMandate,
  W3CVerifiableCredential,
  ValidationResult,
  TransactionStatus,
  isAP2Transaction,
  isSpendingMandate,
  isW3CVerifiableCredential,
} from './schemas.js';

// ─── Errors ───────────────────────────────────────────────────────────────────

export class MandateExceededError extends Error {
  constructor(
    public readonly transactionId: string,
    public readonly requestedAmount: number,
    public readonly mandateLimit: number,
    public readonly cumulativeSpent: number,
  ) {
    super(
      `MandateExceeded: transaction ${transactionId} requests $${requestedAmount} but ` +
        `mandate limit is $${mandateLimit} (cumulative spent: $${cumulativeSpent})`,
    );
    this.name = 'MandateExceededError';
  }
}

export class CredentialVerificationError extends Error {
  constructor(reason: string) {
    super(`CredentialVerificationFailed: ${reason}`);
    this.name = 'CredentialVerificationError';
  }
}

export class SchemaValidationError extends Error {
  constructor(field: string, reason: string) {
    super(`SchemaValidationFailed: ${field} — ${reason}`);
    this.name = 'SchemaValidationError';
  }
}

// ─── AP2Handler ───────────────────────────────────────────────────────────────

/**
 * Handles Agent Payment Protocol (AP2) transactions.
 * Enforces spending mandates and W3C Verifiable Credential verification.
 *
 * Requirements: 6.3, 5.6
 */
export class AP2Handler {
  private readonly wallets: Map<string, AgentWallet> = new Map();
  private readonly logger: Logger;

  constructor(logger?: Logger) {
    this.logger = logger ?? defaultLogger;
  }

  // ─── initiateTransaction ──────────────────────────────────────────────────

  /**
   * Initiate an AP2 transaction.
   * Validates mandate and credential before creating the transaction record.
   * Throws MandateExceededError if the transaction exceeds the spending mandate.
   */
  initiateTransaction(params: InitiateTransactionParams): AP2Transaction {
    const { tenantId, agentId, transactionType, amountUsd, targetResource, mandate, credential } =
      params;

    // Validate mandate structure
    if (!isSpendingMandate(mandate)) {
      throw new SchemaValidationError('spending_mandate', 'invalid mandate structure');
    }

    // Validate credential structure
    this.verifyCredential(credential);

    // Validate mandate
    const mandateResult = this.validateMandate(mandate, transactionType, amountUsd);
    if (!mandateResult.valid) {
      const transactionId = randomUUID();
      this.logger.error('Mandate validation failed', {
        transactionId,
        reason: mandateResult.reason,
      });

      if (mandateResult.reason?.includes('exceeds')) {
        throw new MandateExceededError(
          transactionId,
          amountUsd,
          mandate.max_amount_usd,
          mandate.cumulative_spent_usd,
        );
      }

      throw new SchemaValidationError('spending_mandate', mandateResult.reason ?? 'invalid');
    }

    const transaction: AP2Transaction = {
      transaction_id: randomUUID(),
      tenant_id: tenantId,
      initiating_agent: agentId,
      transaction_type: transactionType,
      amount_usd: amountUsd,
      target_resource: targetResource,
      spending_mandate: mandate,
      w3c_credential: credential,
      status: mandate.requires_governor_approval ? 'PENDING' : 'SUBMITTED',
      created_at: new Date().toISOString(),
    };

    this.logger.info('AP2 transaction initiated', {
      transactionId: transaction.transaction_id,
      status: transaction.status,
    });

    return transaction;
  }

  // ─── validateMandate ──────────────────────────────────────────────────────

  /**
   * Validate a spending mandate against a proposed transaction.
   * Called by Governor_Agent before transaction submission (Req 5.6).
   */
  validateMandate(
    mandate: SpendingMandate,
    transactionType: AP2Transaction['transaction_type'],
    amountUsd: number,
  ): ValidationResult {
    const now = new Date();
    const validFrom = new Date(mandate.valid_from);
    const validUntil = new Date(mandate.valid_until);

    // Check validity window
    if (now < validFrom) {
      return {
        valid: false,
        transaction_id: '',
        validated_at: now.toISOString(),
        reason: `Mandate not yet valid (valid_from: ${mandate.valid_from})`,
      };
    }

    if (now > validUntil) {
      return {
        valid: false,
        transaction_id: '',
        validated_at: now.toISOString(),
        reason: `Mandate expired (valid_until: ${mandate.valid_until})`,
      };
    }

    // Check allowed action types
    if (!mandate.allowed_action_types.includes(transactionType)) {
      return {
        valid: false,
        transaction_id: '',
        validated_at: now.toISOString(),
        reason: `Transaction type ${transactionType} not in allowed_action_types`,
      };
    }

    // Check per-transaction amount
    if (amountUsd > mandate.max_amount_usd) {
      return {
        valid: false,
        transaction_id: '',
        validated_at: now.toISOString(),
        reason: `Amount $${amountUsd} exceeds mandate limit $${mandate.max_amount_usd}`,
      };
    }

    // Check cumulative spend
    const projectedTotal = mandate.cumulative_spent_usd + amountUsd;
    if (projectedTotal > mandate.max_amount_usd) {
      return {
        valid: false,
        transaction_id: '',
        validated_at: now.toISOString(),
        reason: `Cumulative spend $${projectedTotal} would exceed mandate limit $${mandate.max_amount_usd}`,
      };
    }

    return {
      valid: true,
      transaction_id: '',
      validated_at: now.toISOString(),
    };
  }

  // ─── verifyCredential ─────────────────────────────────────────────────────

  /**
   * Verify a W3C Verifiable Credential (basic structure check).
   * Throws CredentialVerificationError if the credential is invalid.
   */
  verifyCredential(credential: W3CVerifiableCredential): void {
    if (!isW3CVerifiableCredential(credential)) {
      throw new CredentialVerificationError('invalid credential structure');
    }

    // Verify @context includes W3C VC context
    const hasVcContext = credential['@context'].some(
      (ctx) =>
        ctx === 'https://www.w3.org/2018/credentials/v1' ||
        ctx === 'https://www.w3.org/ns/credentials/v2',
    );
    if (!hasVcContext) {
      throw new CredentialVerificationError(
        'missing W3C VC context (https://www.w3.org/2018/credentials/v1)',
      );
    }

    // Verify type includes VerifiableCredential
    if (!credential.type.includes('VerifiableCredential')) {
      throw new CredentialVerificationError('type must include "VerifiableCredential"');
    }

    // Verify issuanceDate is a valid ISO-8601 date
    const issuanceDate = new Date(credential.issuanceDate);
    if (isNaN(issuanceDate.getTime())) {
      throw new CredentialVerificationError('issuanceDate is not a valid ISO-8601 date');
    }

    // Verify not expired
    if (credential.expirationDate) {
      const expirationDate = new Date(credential.expirationDate);
      if (isNaN(expirationDate.getTime())) {
        throw new CredentialVerificationError('expirationDate is not a valid ISO-8601 date');
      }
      if (new Date() > expirationDate) {
        throw new CredentialVerificationError(
          `Credential expired at ${credential.expirationDate}`,
        );
      }
    }

    // Verify credentialSubject has an id
    if (typeof credential.credentialSubject.id !== 'string') {
      throw new CredentialVerificationError('credentialSubject.id must be a string');
    }
  }

  // ─── parse / serialize ────────────────────────────────────────────────────

  parse(raw: string): AP2Transaction {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new SchemaValidationError('raw', 'invalid JSON');
    }

    if (!isAP2Transaction(parsed)) {
      throw new SchemaValidationError('AP2Transaction', 'schema validation failed');
    }

    return parsed as AP2Transaction;
  }

  serialize(transaction: AP2Transaction): string {
    return JSON.stringify(transaction, null, 2);
  }

  // ─── applyGovernorApproval ────────────────────────────────────────────────

  /**
   * Apply Governor_Agent validation result to a transaction.
   * Sets governor_validation_ts (must precede submission_ts per Req 5.6).
   */
  applyGovernorApproval(
    transaction: AP2Transaction,
    validation: ValidationResult,
  ): AP2Transaction {
    const governorValidationTs = new Date().toISOString();

    if (!validation.valid) {
      return {
        ...transaction,
        status: 'GOVERNOR_REJECTED',
        governor_validation_ts: governorValidationTs,
      };
    }

    return {
      ...transaction,
      status: 'GOVERNOR_APPROVED',
      governor_validation_ts: governorValidationTs,
    };
  }

  // ─── submitTransaction ────────────────────────────────────────────────────

  /**
   * Submit an approved transaction.
   * Enforces that governor_validation_ts precedes submission_ts (Req 5.6).
   */
  submitTransaction(transaction: AP2Transaction): AP2Transaction {
    if (
      transaction.spending_mandate.requires_governor_approval &&
      transaction.status !== 'GOVERNOR_APPROVED'
    ) {
      throw new Error(
        `Cannot submit transaction ${transaction.transaction_id}: requires governor approval (status: ${transaction.status})`,
      );
    }

    const submissionTs = new Date().toISOString();

    // Invariant: governor_validation_ts must precede submission_ts
    if (
      transaction.governor_validation_ts &&
      new Date(transaction.governor_validation_ts) > new Date(submissionTs)
    ) {
      throw new Error('Invariant violation: governor_validation_ts must precede submission_ts');
    }

    return {
      ...transaction,
      status: 'SUBMITTED',
      submission_ts: submissionTs,
    };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InitiateTransactionParams {
  tenantId: string;
  agentId: string;
  transactionType: AP2Transaction['transaction_type'];
  amountUsd: number;
  targetResource: string;
  mandate: SpendingMandate;
  credential: W3CVerifiableCredential;
}

interface Logger {
  error(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
}

const defaultLogger: Logger = {
  error: (msg, meta) => console.error(`[AP2Handler] ${msg}`, meta ?? ''),
  info: (msg, meta) => console.info(`[AP2Handler] ${msg}`, meta ?? ''),
};
