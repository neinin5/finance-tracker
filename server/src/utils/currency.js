export const EXCHANGE_RATE_THB_PER_GBP = 45

// Approximate rates to GBP (updated periodically — not live)
export const RATES_TO_GBP = {
  GBP: 1,
  THB: 1 / EXCHANGE_RATE_THB_PER_GBP,
  EUR: 1.17,  // 1 EUR ≈ 1.17 GBP  (update as needed)
  USD: 0.79   // 1 USD ≈ 0.79 GBP  (update as needed)
}

export const SUPPORTED_CURRENCIES = ['GBP', 'THB', 'EUR', 'USD']

/**
 * Convert any supported currency amount to GBP.
 * @param {number} amount
 * @param {'GBP'|'THB'|'EUR'|'USD'} currency
 * @returns {number}
 */
export function toGBP(amount, currency = 'GBP') {
  const rate = RATES_TO_GBP[currency] ?? 1
  return Number(amount) * rate
}

export function gbpToThb(gbp) {
  return Number(gbp) * EXCHANGE_RATE_THB_PER_GBP
}
