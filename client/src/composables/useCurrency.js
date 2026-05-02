export const EXCHANGE_RATE_THB_PER_GBP = 45

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

export function useCurrency() {
  return {
    EXCHANGE_RATE_THB_PER_GBP,
    gbpToThb,
    thbToGbp,
    formatTHB,
    formatGBP
  }
}
