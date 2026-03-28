import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setTenantContext, clearTenantContext } from './rls';
import type { ClientBase } from 'pg';

function makeClient(): ClientBase & { query: ReturnType<typeof vi.fn> } {
  return { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as ClientBase & {
    query: ReturnType<typeof vi.fn>;
  };
}

describe('setTenantContext', () => {
  let client: ReturnType<typeof makeClient>;

  beforeEach(() => {
    client = makeClient();
  });

  it('issues SET LOCAL with the provided tenant UUID', async () => {
    const tenantId = '123e4567-e89b-12d3-a456-426614174000';
    await setTenantContext(client, tenantId);
    expect(client.query).toHaveBeenCalledWith(
      'SET LOCAL app.current_tenant_id = $1',
      [tenantId],
    );
  });

  it('accepts uppercase UUID', async () => {
    const tenantId = '123E4567-E89B-12D3-A456-426614174000';
    await expect(setTenantContext(client, tenantId)).resolves.toBeUndefined();
  });

  it('rejects a non-UUID string', async () => {
    await expect(setTenantContext(client, 'not-a-uuid')).rejects.toThrow(
      'Invalid tenant_id format',
    );
    expect(client.query).not.toHaveBeenCalled();
  });

  it('rejects an empty string', async () => {
    await expect(setTenantContext(client, '')).rejects.toThrow(
      'Invalid tenant_id format',
    );
  });

  it('rejects a UUID with extra characters', async () => {
    await expect(
      setTenantContext(client, '123e4567-e89b-12d3-a456-426614174000-extra'),
    ).rejects.toThrow('Invalid tenant_id format');
  });
});

describe('clearTenantContext', () => {
  it('resets the session variable to an empty string', async () => {
    const client = makeClient();
    await clearTenantContext(client);
    expect(client.query).toHaveBeenCalledWith(
      "SET LOCAL app.current_tenant_id = ''",
    );
  });
});
