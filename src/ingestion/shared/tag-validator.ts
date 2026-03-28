/**
 * TagValidator — enforces required tenant tags on raw billing records
 * before they are published to Kafka.
 */

export interface TagValidationResult {
  valid: boolean
  missing_tags: string[]
  record_id: string
}

const DEFAULT_REQUIRED_TAGS = ['tenant_id', 'environment', 'owner']

export class TagValidator {
  private readonly requiredTags: string[]

  constructor(requiredTags: string[] = DEFAULT_REQUIRED_TAGS) {
    this.requiredTags = requiredTags
  }

  validate(tags: Record<string, string>, recordId: string): TagValidationResult {
    const missing = this.requiredTags.filter(
      (tag) => !tags[tag] || tags[tag].trim() === '',
    )
    return {
      valid: missing.length === 0,
      missing_tags: missing,
      record_id: recordId,
    }
  }

  /** Returns true if all required tags are present and non-empty */
  isValid(tags: Record<string, string>): boolean {
    return this.requiredTags.every((tag) => tags[tag] && tags[tag].trim() !== '')
  }
}
