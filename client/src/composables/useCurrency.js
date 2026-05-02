export const EXCHANGE_RATE_THB_PER_GBP = 45

// Approximate rates to GBP — keep in sync with server/src/utils/currency.js
export const RATES_TO_GBP = {
  GBP: 1,
  THB: 1 / EXCHANGE_RATE_THB_PER_GBP,
  EUR: 1.17,
  USD: 0.79
}

export const SUPPORTED_CURRENCIES = ['GBP', 'THB', 'EUR', 'USD']

export const CURRENCY_SYMBOLS = {
  GBP: '£',
  THB: '฿',
  EUR: '€',
  USD: '$'
}

/** Convert any supported currency to GBP */
export function toGBP(amount, currency = 'GBP') {
  const rate = RATES_TO_GBP[currency] ?? 1
  return Number(amount) * rate
}

export function gbpToThb(gbp) {
  return Number(gbp) * EXCHANGE_RATE_THB_PER_GBP
}

export function thbToGbp(thb) {
  return Number(thb) / EXCHANGE_RATE_THB_PER_GBP
}

export function formatTHB(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'THB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatGBP(amount) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount)
}

/** Format any supported currency */
export function formatCurrency(amount, currency = 'GBP') {
  const fractionDigits = currency === 'THB' ? 0 : 2
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(amount)
}

export function useCurrency() {
  return {
    EXCHANGE_RATE_THB_PER_GBP,
    RATES_TO_GBP,
    SUPPORTED_CURRENCIES,
    CURRENCY_SYMBOLS,
    toGBP,
    gbpToThb,
    thbToGbp,
    formatTHB,
    formatGBP,
    formatCurrency
  }
}
