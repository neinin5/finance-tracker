import ExchangeRate from '../models/ExchangeRate.js'

const FRANKFURTER_BASE = 'https://api.frankfurter.app'
const STALE_AFTER_MS = 12 * 60 * 60 * 1000 // refetch after 12h

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

function daysAgo(n) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d
}

async function fetchRange(startDate, endDate) {
  const url = `${FRANKFURTER_BASE}/${startDate}..${endDate}?from=GBP&to=THB`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Frankfurter API error: ${res.status} ${res.statusText}`)
  }
  const data = await res.json()
  const ops = []
  for (const [date, rates] of Object.entries(data.rates || {})) {
    if (rates && typeof rates.THB === 'number') {
      ops.push({
        updateOne: {
          filter: { date },
          update: {
            $set: {
              date,
              gbpToThb: rates.THB,
              source: 'frankfurter.app',
              fetchedAt: new Date()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (ops.length) await ExchangeRate.bulkWrite(ops)
  return ops.length
}

export async function getRateHistory({ days = 30 } = {}) {
  const startDate = isoDate(daysAgo(days))
  const endDate = isoDate(new Date())

  const latest = await ExchangeRate.findOne().sort({ fetchedAt: -1 })
  const stale =
    !latest || Date.now() - new Date(latest.fetchedAt).getTime() > STALE_AFTER_MS

  if (stale) {
    try {
      await fetchRange(startDate, endDate)
    } catch (err) {
      console.error('Exchange rate fetch failed, falling back to cache:', err.message)
    }
  }

  const rates = await ExchangeRate.find({ date: { $gte: startDate } })
    .sort({ date: 1 })
    .lean()

  return {
    rates: rates.map((r) => ({ date: r.date, rate: r.gbpToThb })),
    fetchedAt: latest?.fetchedAt || null,
    source: 'frankfurter.app',
    note: `Market mid-rate from frankfurter.app (ECB). Budget conversions in this app use a fixed rate of 45 THB = 1 GBP for consistency.`
  }
}
