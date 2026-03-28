/**
 * CostNormalizer — converts billing amounts to USD using static exchange rates.
 * In production, rates would be fetched from a live FX API.
 */

const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  EUR: 1.08,
  GBP: 1.27,
  JPY: 0.0067,
  CAD: 0.74,
  AUD: 0.65,
  CHF: 1.12,
  CNY: 0.14,
  INR: 0.012,
}

export interface NormalizationResult {
  amount_usd: number
  original_amount: number
  original_currency: string
  exchange_rate: number
}

export class CostNormalizer {
  private readonly rates: Record<string, number>

  constructor(customRates?: Record<string, number>) {
    this.rates = { ...EXCHANGE_RATES_TO_USD, ...(customRates ?? {}) }
  }

  normalize(amount: number, currency: string): NormalizationResult {
    const upperCurrency = currency.toUpperCase()
    const rate = this.rates[upperCurrency]

    if (rate === undefined) {
      // Unknown currency — log and fall back to 1:1 (USD assumption)
      console.warn(`[CostNormalizer] Unknown currency "${currency}", treating as USD`)
      return {
        amount_usd: amount,
        original_amount: amount,
        original_currency: currency,
        exchange_rate: 1.0,
      }
    }

    return {
      amount_usd: parseFloat((amount * rate).toFixed(6)),
      original_amount: amount,
      original_currency: currency,
      exchange_rate: rate,
    }
  }

  /** Convert a daily or monthly cost to hourly USD */
  toHourlyUsd(amount: number, currency: string, periodHours: number): number {
    const { amount_usd } = this.normalize(amount, currency)
    return parseFloat((amount_usd / periodHours).toFixed(6))
  }
}
