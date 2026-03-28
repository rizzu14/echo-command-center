/**
 * RBACMiddleware — Security
 * Task 74
 */

import type { LiquidLedger } from '../ledger/liquid-ledger.js'

export type Role =
  | 'READ_ONLY_ANALYST'
  | 'OPERATOR'
  | 'FINANCE_ADMINISTRATOR'
  | 'PLATFORM_ADMINISTRATOR'

export type Permission =
  | 'read:metrics'
  | 'read:reports'
  | 'read:ledger'
  | 'write:actions'
  | 'execute:actions'
  | 'read:billing'
  | 'write:billing'
  | 'manage:tenants'
  | 'manage:users'
  | 'activate:kill_switch'
  | 'read:all'
  | 'write:all'

const PERMISSION_MATRIX: Record<Role, Permission[]> = {
  READ_ONLY_ANALYST: ['read:metrics', 'read:reports', 'read:ledger'],
  OPERATOR: ['read:metrics', 'read:reports', 'read:ledger', 'write:actions', 'execute:actions'],
  FINANCE_ADMINISTRATOR: ['read:metrics', 'read:reports', 'read:ledger', 'read:billing', 'write:billing'],
  PLATFORM_ADMINISTRATOR: [
    'read:metrics', 'read:reports', 'read:ledger',
    'write:actions', 'execute:actions',
    'read:billing', 'write:billing',
    'manage:tenants', 'manage:users',
    'activate:kill_switch',
    'read:all', 'write:all',
  ],
}

export interface AuthContext {
  user_id: string
  tenant_id: string
  role: Role
}

export interface AccessResult {
  allowed: boolean
  reason?: string
}

export class RBACMiddleware {
  constructor(private ledger?: LiquidLedger) {}

  check(auth: AuthContext, permission: Permission): AccessResult {
    const allowed = PERMISSION_MATRIX[auth.role]?.includes(permission) ?? false

    if (!allowed) {
      this._logUnauthorized(auth, permission)
      return {
        allowed: false,
        reason: `Role ${auth.role} does not have permission: ${permission}`,
      }
    }

    return { allowed: true }
  }

  enforce(auth: AuthContext, permission: Permission): void {
    const result = this.check(auth, permission)
    if (!result.allowed) {
      throw new Error(`Access denied: ${result.reason}`)
    }
  }

  getPermissions(role: Role): Permission[] {
    return [...(PERMISSION_MATRIX[role] ?? [])]
  }

  private _logUnauthorized(auth: AuthContext, permission: Permission): void {
    if (!this.ledger) return
    this.ledger.append({
      entry_id: `unauth-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      tenant_id: auth.tenant_id,
      agent_id: 'RBAC_MIDDLEWARE',
      action_type: 'UNAUTHORIZED_ATTEMPT',
      payload: {
        user_id: auth.user_id,
        role: auth.role,
        attempted_permission: permission,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  }
}
