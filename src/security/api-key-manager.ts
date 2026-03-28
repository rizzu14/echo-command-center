/**
 * APIKeyManager — Security
 * Task 75
 */

import { createHash, randomBytes, pbkdf2Sync } from 'crypto'
import type { Role } from './rbac.js'
import type { LiquidLedger } from '../ledger/liquid-ledger.js'

export interface APIKey {
  key_id: string
  tenant_id: string
  role: Role
  created_at: string
  last_used_at?: string
}

export interface StoredAPIKey extends APIKey {
  hash: string
  salt: string
}

export interface APIKeyValidationResult {
  valid: boolean
  tenant_id?: string
  role?: Role
  key_id?: string
}

const PBKDF2_ITERATIONS = 100_000
const PBKDF2_KEY_LEN = 64
const PBKDF2_DIGEST = 'sha512'

export class APIKeyManager {
  private keys = new Map<string, StoredAPIKey>() // keyed by key_id
  private keyIndex = new Map<string, string>()   // hash prefix → key_id for lookup

  constructor(private ledger?: LiquidLedger) {}

  generate(tenantId: string, role: Role): { key: string; metadata: APIKey } {
    const rawKey = randomBytes(32).toString('hex')
    const key_id = `key-${randomBytes(8).toString('hex')}`
    const salt = randomBytes(16).toString('hex')

    const hash = pbkdf2Sync(rawKey, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LEN, PBKDF2_DIGEST).toString('hex')

    const metadata: APIKey = {
      key_id,
      tenant_id: tenantId,
      role,
      created_at: new Date().toISOString(),
    }

    const stored: StoredAPIKey = { ...metadata, hash, salt }
    this.keys.set(key_id, stored)

    // Store a prefix of the hash for fast lookup
    const prefix = hash.slice(0, 16)
    this.keyIndex.set(prefix, key_id)

    return { key: `${key_id}.${rawKey}`, metadata }
  }

  validate(key: string): APIKeyValidationResult {
    const dotIdx = key.indexOf('.')
    if (dotIdx === -1) return { valid: false }

    const key_id = key.slice(0, dotIdx)
    const rawKey = key.slice(dotIdx + 1)

    const stored = this.keys.get(key_id)
    if (!stored) return { valid: false }

    const hash = pbkdf2Sync(rawKey, stored.salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LEN, PBKDF2_DIGEST).toString('hex')

    if (hash !== stored.hash) return { valid: false }

    // Update last used
    stored.last_used_at = new Date().toISOString()

    return {
      valid: true,
      tenant_id: stored.tenant_id,
      role: stored.role,
      key_id: stored.key_id,
    }
  }

  logUsage(keyId: string, callingIp: string, operation: string): void {
    if (!this.ledger) return
    const stored = this.keys.get(keyId)
    if (!stored) return

    this.ledger.append({
      entry_id: `api-usage-${keyId}-${Date.now()}`,
      tenant_id: stored.tenant_id,
      agent_id: 'API_KEY_MANAGER',
      action_type: 'API_KEY_USAGE',
      payload: {
        key_id: keyId,
        calling_ip: callingIp,
        operation,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  }

  revoke(keyId: string): boolean {
    return this.keys.delete(keyId)
  }
}
