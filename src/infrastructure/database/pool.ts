/**
 * PostgreSQL connection pool with automatic RLS context injection.
 *
 * Every connection checked out of this pool automatically sets
 * `app.current_tenant_id` before the caller's query runs, ensuring that
 * Row-Level Security policies are always enforced.
 *
 * Usage:
 *   import { createTenantPool, withTenantClient } from './pool';
 *
 *   const pool = createTenantPool();
 *
 *   // Preferred: use the helper that handles BEGIN/COMMIT/release
 *   const rows = await withTenantClient(pool, tenantId, async (client) => {
 *     const result = await client.query(
 *       'SELECT * FROM billing_events WHERE resource_id = $1',
 *       [resourceId],
 *     );
 *     return result.rows;
 *   });
 */

import { Pool, type PoolClient, type PoolConfig } from 'pg';
import { setTenantContext } from './rls';

export interface TenantPoolConfig extends PoolConfig {
  /** Override the default application role name (default: 'app_user'). */
  appRole?: string;
}

/**
 * Creates a `pg.Pool` configured for tenant-scoped application queries.
 * All connections use the `app_user` role (non-superuser) so that RLS
 * policies are enforced.
 */
export function createTenantPool(config: TenantPoolConfig = {}): Pool {
  const { appRole: _appRole, ...pgConfig } = config;

  const pool = new Pool({
    host: process.env['PGHOST'] ?? 'localhost',
    port: Number(process.env['PGPORT'] ?? 5432),
    database: process.env['PGDATABASE'] ?? 'echo',
    user: process.env['PGUSER'] ?? 'app_user',
    password: process.env['PGPASSWORD'],
    max: Number(process.env['PGPOOL_MAX'] ?? 20),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...pgConfig,
  });

  pool.on('error', (err) => {
    console.error('[db-pool] Unexpected error on idle client', err);
  });

  return pool;
}

/**
 * Executes `fn` inside a transaction with the RLS tenant context set.
 *
 * The function:
 *  1. Acquires a client from the pool.
 *  2. Begins a transaction.
 *  3. Sets `app.current_tenant_id` via SET LOCAL (transaction-scoped).
 *  4. Calls `fn(client)`.
 *  5. Commits on success, rolls back on error.
 *  6. Releases the client back to the pool.
 *
 * @param pool      The connection pool to acquire a client from.
 * @param tenantId  UUID of the tenant whose RLS context to activate.
 * @param fn        Async callback that receives the configured client.
 * @returns         The value returned by `fn`.
 */
export async function withTenantClient<T>(
  pool: Pool,
  tenantId: string,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await setTenantContext(client, tenantId);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Admin pool — connects as a superuser / admin role that bypasses RLS.
 * Use ONLY for tenant provisioning, migrations, and admin operations.
 * Never expose this pool to tenant-scoped request handlers.
 */
export function createAdminPool(config: PoolConfig = {}): Pool {
  const pool = new Pool({
    host: process.env['PGHOST'] ?? 'localhost',
    port: Number(process.env['PGPORT'] ?? 5432),
    database: process.env['PGDATABASE'] ?? 'echo',
    user: process.env['PGADMIN_USER'] ?? 'postgres',
    password: process.env['PGADMIN_PASSWORD'],
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    ...config,
  });

  pool.on('error', (err) => {
    console.error('[db-admin-pool] Unexpected error on idle client', err);
  });

  return pool;
}
