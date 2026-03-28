/**
 * Kafka ACL configuration helpers for tenant-scoped topic access.
 *
 * Each tenant's producers and consumers are restricted to topics prefixed
 * with their tenant_id. System topics (raw.billing.events, events.*, governance.*)
 * are accessible only to internal ECHO service accounts.
 *
 * ACL resource types use Kafka's prefix-based matching (PREFIXED pattern).
 */

export type AclOperation = 'READ' | 'WRITE' | 'CREATE' | 'DELETE' | 'DESCRIBE' | 'ALL'
export type AclPermission = 'ALLOW' | 'DENY'
export type AclResourceType = 'TOPIC' | 'GROUP' | 'CLUSTER'
export type AclPatternType = 'LITERAL' | 'PREFIXED'

export interface AclEntry {
  resourceType: AclResourceType
  resourceName: string
  patternType: AclPatternType
  principal: string
  host: string
  operation: AclOperation
  permission: AclPermission
}

/**
 * Generate ACL entries that allow a tenant's service account to produce
 * to their own prefixed topics only.
 *
 * @param tenantId - The tenant identifier
 * @param serviceAccountName - Kafka principal (e.g. "User:tenant-abc123-producer")
 */
export function tenantProducerAcls(tenantId: string, serviceAccountName: string): AclEntry[] {
  return [
    {
      resourceType: 'TOPIC',
      resourceName: `${tenantId}.`,
      patternType: 'PREFIXED',
      principal: serviceAccountName,
      host: '*',
      operation: 'WRITE',
      permission: 'ALLOW',
    },
    {
      resourceType: 'TOPIC',
      resourceName: `${tenantId}.`,
      patternType: 'PREFIXED',
      principal: serviceAccountName,
      host: '*',
      operation: 'DESCRIBE',
      permission: 'ALLOW',
    },
  ]
}

/**
 * Generate ACL entries that allow a tenant's service account to consume
 * from their own prefixed topics only, within a tenant-scoped consumer group.
 *
 * @param tenantId - The tenant identifier
 * @param serviceAccountName - Kafka principal (e.g. "User:tenant-abc123-consumer")
 */
export function tenantConsumerAcls(tenantId: string, serviceAccountName: string): AclEntry[] {
  return [
    {
      resourceType: 'TOPIC',
      resourceName: `${tenantId}.`,
      patternType: 'PREFIXED',
      principal: serviceAccountName,
      host: '*',
      operation: 'READ',
      permission: 'ALLOW',
    },
    {
      resourceType: 'TOPIC',
      resourceName: `${tenantId}.`,
      patternType: 'PREFIXED',
      principal: serviceAccountName,
      host: '*',
      operation: 'DESCRIBE',
      permission: 'ALLOW',
    },
    // Consumer group scoped to tenant prefix
    {
      resourceType: 'GROUP',
      resourceName: `${tenantId}.`,
      patternType: 'PREFIXED',
      principal: serviceAccountName,
      host: '*',
      operation: 'READ',
      permission: 'ALLOW',
    },
  ]
}

/**
 * Generate ACL entries for an internal ECHO service account that needs
 * read/write access to system-wide topics (e.g. ingestion-service, orchestrator).
 *
 * @param serviceAccountName - Kafka principal (e.g. "User:echo-ingestion-service")
 * @param systemTopics - List of system topic names to grant access to
 * @param operations - Operations to allow (default: READ + WRITE)
 */
export function systemServiceAcls(
  serviceAccountName: string,
  systemTopics: string[],
  operations: AclOperation[] = ['READ', 'WRITE', 'DESCRIBE'],
): AclEntry[] {
  return systemTopics.flatMap((topic) =>
    operations.map((operation) => ({
      resourceType: 'TOPIC' as AclResourceType,
      resourceName: topic,
      patternType: 'LITERAL' as AclPatternType,
      principal: serviceAccountName,
      host: '*',
      operation,
      permission: 'ALLOW' as AclPermission,
    })),
  )
}

/**
 * Generate all ACL entries for a newly provisioned tenant.
 * Returns both producer and consumer ACLs for the tenant's service accounts.
 */
export function allTenantAcls(tenantId: string): {
  producerAcls: AclEntry[]
  consumerAcls: AclEntry[]
} {
  const producerPrincipal = `User:${tenantId}-producer`
  const consumerPrincipal = `User:${tenantId}-consumer`

  return {
    producerAcls: tenantProducerAcls(tenantId, producerPrincipal),
    consumerAcls: tenantConsumerAcls(tenantId, consumerPrincipal),
  }
}
