/**
 * RLS context helper.
 *
 * Every application connection must call `setTenantContext` before executing
 * any query against a tenant-scoped table.  The function issues:
 *
 *   SET LOCAL app.current_tenant_id = '<uuid>'
 *
 * which is visible only within the current transaction.  PostgreSQL RLS
 * policies read this value via `current_setting('app.current_tenant_id')::uuid`
 * to enforce per-tenant row visibility.
 *
 * Usage:
 *   const client = await pool.connect();
 *   await client.query('BEGIN');
 *   await setTenantContext(client, tenantId);
 *   // ... run queries ...
 *   await client.query('COMMIT');
 *   client.release();
 */

import type { ClientBase } from 'pg';

/**
 * Sets the `app.current_tenant_id` session-local variable on the given
 * PostgreSQL client so that RLS policies can filter rows by tenant.
 *
 * Must be called inside an open transaction (`BEGIN` must precede this call)
 * because `SET LOCAL` is transaction-scoped and resets on `COMMIT`/`ROLLBACK`.
 *
 * @param client  An active `pg` client or pool client.
 * @param tenantId  The UUID of the tenant whose data should be visible.
 */
export async function setTenantContext(
  client: ClientBase,
  tenantId: string,
): Promise<void> {
  // Validate UUID format before sending to the database to prevent injection.
  if (!isValidUUID(tenantId)) {
    throw new Error(`Invalid tenant_id format: "${tenantId}"`);
  }
  await client.query('SET LOCAL app.current_tenant_id = $1', [tenantId]);
}

/**
 * Clears the tenant context by resetting the session variable to an empty
 * string.  Useful when returning a connection to a pool that may be reused
 * across tenants without a transaction boundary.
 *
 * Note: RLS policies will reject queries with an empty tenant_id, so this
 * effectively makes the connection unusable for tenant-scoped queries until
 * `setTenantContext` is called again.
 */
export async function clearTenantContext(client: ClientBase): Promise<void> {
  await client.query("SET LOCAL app.current_tenant_id = ''");
}

/** Lightweight UUID v4 format check (does not validate version bits). */
function isValidUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}
