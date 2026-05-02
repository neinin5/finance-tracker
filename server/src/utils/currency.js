export const EXCHANGE_RATE_THB_PER_GBP = 45

export function gbpToThb(gbp) {
  return Number(gbp) * EXCHANGE_RATE_THB_PER_GBP
}
