/**
 * InjectionSanitizer — detects and rejects prompt injection attempts.
 *
 * Requirements: 5.3, 15.1
 */

import { randomUUID } from 'crypto'
import type { LedgerWriteEvent } from '../../infrastructure/kafka/schemas/ledger-write-event.js'

export interface SanitizationResult {
  safe: boolean
  payload: unknown
  detectedPatterns: string[]
  rejectedAt?: string
}

export interface InjectionSanitizerDeps {
  /** Write injection attempt to Liquid_Ledger */
  writeLedger(event: LedgerWriteEvent): Promise<void>
  /** Notify tenant administrators of injection attempt */
  notifyAdmins(tenantId: string, message: string): Promise<void>
}

/** Mathematical payload injection patterns */
const MATH_INJECTION_PATTERNS: RegExp[] = [
  /\beval\s*\(/i,
  /\bexec\s*\(/i,
  /\bFunction\s*\(/i,
  /\bnew\s+Function\b/i,
  /\bsetTimeout\s*\(/i,
  /\bsetInterval\s*\(/i,
  /\bprocess\.env\b/i,
  /\brequire\s*\(/i,
  /\bimport\s*\(/i,
  /\b__proto__\b/i,
  /\bconstructor\s*\[/i,
]

/** Logical structure injection patterns */
const LOGICAL_INJECTION_PATTERNS: RegExp[] = [
  /\bOR\s+1\s*=\s*1\b/i,
  /\bAND\s+1\s*=\s*1\b/i,
  /'\s*OR\s*'/i,
  /;\s*DROP\s+TABLE/i,
  /;\s*DELETE\s+FROM/i,
  /UNION\s+SELECT/i,
  /\bSLEEP\s*\(\d+\)/i,
  /\bWAITFOR\s+DELAY\b/i,
]

/** Role-override instruction patterns */
const ROLE_OVERRIDE_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /you\s+are\s+now\s+(a\s+)?(?:different|new|another)\s+(?:ai|assistant|model|agent)/i,
  /disregard\s+(your\s+)?(?:instructions?|guidelines?|rules?|constraints?)/i,
  /act\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:a\s+)?(?:different|unrestricted|jailbroken)/i,
  /pretend\s+(?:you\s+(?:are|have\s+no))\s+(?:restrictions?|guidelines?|rules?)/i,
  /system\s*:\s*you\s+are/i,
  /\[SYSTEM\]/i,
  /\bDAN\b.*mode/i,
]

/**
 * InjectionSanitizer scans all incoming agent task payloads for injection
 * patterns before they reach the Reasoning_Engine.
 *
 * On detection: rejects payload, logs to Liquid_Ledger, notifies admins.
 * No injected payload may reach the Reasoning_Engine.
 */
export class InjectionSanitizer {
  private readonly deps: InjectionSanitizerDeps

  constructor(deps: InjectionSanitizerDeps) {
    this.deps = deps
  }

  /**
   * Sanitize an incoming payload.
   * Returns { safe: true } if no injection patterns detected.
   * Returns { safe: false } and triggers logging/notification if patterns found.
   */
  async sanitize(
    payload: unknown,
    tenantId: string,
    agentId: string,
  ): Promise<SanitizationResult> {
    const serialized = this.serialize(payload)
    const detectedPatterns = this.detectPatterns(serialized)

    if (detectedPatterns.length === 0) {
      return { safe: true, payload, detectedPatterns: [] }
    }

    const rejectedAt = new Date().toISOString()

    // Log injection attempt to Liquid_Ledger
    const ledgerEvent: LedgerWriteEvent = {
      event_id: randomUUID(),
      tenant_id: tenantId,
      entry_type: 'INJECTION_DETECTED',
      payload: {
        agent_id: agentId,
        detected_patterns: detectedPatterns,
        rejected_at: rejectedAt,
        payload_preview: serialized.slice(0, 500), // truncate for safety
      },
      agent_id: agentId,
      timestamp: rejectedAt,
    }

    // Both ledger write and notification must complete
    await Promise.all([
      this.deps.writeLedger(ledgerEvent),
      this.deps.notifyAdmins(
        tenantId,
        `Prompt injection attempt detected from agent ${agentId}. Patterns: ${detectedPatterns.join(', ')}. Rejected at: ${rejectedAt}`,
      ),
    ])

    return {
      safe: false,
      payload: null, // never return the injected payload
      detectedPatterns,
      rejectedAt,
    }
  }

  private serialize(payload: unknown): string {
    if (typeof payload === 'string') return payload
    try {
      return JSON.stringify(payload)
    } catch {
      return String(payload)
    }
  }

  private detectPatterns(text: string): string[] {
    const detected: string[] = []

    for (const pattern of MATH_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        detected.push(`math_injection:${pattern.source}`)
      }
    }

    for (const pattern of LOGICAL_INJECTION_PATTERNS) {
      if (pattern.test(text)) {
        detected.push(`logical_injection:${pattern.source}`)
      }
    }

    for (const pattern of ROLE_OVERRIDE_PATTERNS) {
      if (pattern.test(text)) {
        detected.push(`role_override:${pattern.source}`)
      }
    }

    return detected
  }
}
