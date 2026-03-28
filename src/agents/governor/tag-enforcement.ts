/**
 * ResourceTagEnforcer — validates required tags before execution.
 *
 * Requirements: 1.6, 5.3
 */

export interface ResourceToValidate {
  resource_id: string
  tenant_id: string
  tags: Record<string, string>
}

export interface TagValidationError {
  resource_id: string
  tenant_id: string
  missing_tags: string[]
  message: string
}

export interface TagValidationResult {
  valid: boolean
  error?: TagValidationError
}

/**
 * ResourceTagEnforcer validates that a resource has all required tags
 * before simulation and execution proceed.
 *
 * Wire into Execution_Engine pre-execution check:
 *   const result = enforcer.validate(resource, tenantRequiredTags)
 *   if (!result.valid) throw result.error
 */
export class ResourceTagEnforcer {
  /**
   * Validate that the resource has all required tags.
   * Returns a TagValidationError if any required tag is missing.
   * Tag validation must occur before simulation and execution.
   */
  validate(
    resource: ResourceToValidate,
    tenantRequiredTags: string[],
  ): TagValidationResult {
    const missingTags = tenantRequiredTags.filter(
      (tag) => !(tag in resource.tags) || resource.tags[tag] === '',
    )

    if (missingTags.length === 0) {
      return { valid: true }
    }

    return {
      valid: false,
      error: {
        resource_id: resource.resource_id,
        tenant_id: resource.tenant_id,
        missing_tags: missingTags,
        message: `Resource ${resource.resource_id} is missing required tags: ${missingTags.join(', ')}`,
      },
    }
  }

  /**
   * Validate multiple resources at once.
   * Returns only the resources that failed validation.
   */
  validateBatch(
    resources: ResourceToValidate[],
    tenantRequiredTags: string[],
  ): TagValidationError[] {
    const errors: TagValidationError[] = []
    for (const resource of resources) {
      const result = this.validate(resource, tenantRequiredTags)
      if (!result.valid && result.error) {
        errors.push(result.error)
      }
    }
    return errors
  }
}
