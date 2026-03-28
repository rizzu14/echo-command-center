/**
 * CostImpactCalculator — computes projected monthly savings using the formula:
 *   savings = (current_hourly_cost - optimized_hourly_cost) * hours_per_month
 *
 * Requirements: 1.2, 1.3, 10.1
 */

export interface CostImpactInput {
  current_hourly_cost_usd: number
  optimized_hourly_cost_usd: number
  /** Defaults to 720 (30 days × 24 hours) */
  hours_per_month?: number
}

export interface CostImpactMath {
  current_hourly_cost: number
  optimized_hourly_cost: number
  hours_per_month: number
  /** Required field: projected monthly savings in USD */
  projected_monthly_savings_usd: number
  formula_string: string
}

const DEFAULT_HOURS_PER_MONTH = 720

/**
 * CostImpactCalculator attaches a cost_impact_math object to every playbook
 * and exposes projected_monthly_savings_usd as a required field.
 */
export class CostImpactCalculator {
  /**
   * Compute cost impact math for a given current vs optimized hourly cost.
   * Formula: savings = (current_hourly_cost - optimized_hourly_cost) * hours_per_month
   */
  calculate(input: CostImpactInput): CostImpactMath {
    const hours = input.hours_per_month ?? DEFAULT_HOURS_PER_MONTH
    const projected_monthly_savings_usd =
      (input.current_hourly_cost_usd - input.optimized_hourly_cost_usd) * hours

    return {
      current_hourly_cost: input.current_hourly_cost_usd,
      optimized_hourly_cost: input.optimized_hourly_cost_usd,
      hours_per_month: hours,
      projected_monthly_savings_usd,
      formula_string: `savings = (${input.current_hourly_cost_usd} - ${input.optimized_hourly_cost_usd}) * ${hours} = ${projected_monthly_savings_usd.toFixed(2)}`,
    }
  }

  /**
   * Attach cost_impact_math to a playbook-like object.
   * Returns a new object with cost_impact_math and projected_monthly_savings_usd set.
   */
  attach<T extends { cost_impact_math?: CostImpactMath; estimated_savings_usd?: number }>(
    target: T,
    input: CostImpactInput,
  ): T & { cost_impact_math: CostImpactMath; projected_monthly_savings_usd: number } {
    const math = this.calculate(input)
    return {
      ...target,
      cost_impact_math: math,
      projected_monthly_savings_usd: math.projected_monthly_savings_usd,
    }
  }
}
