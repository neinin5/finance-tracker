<script setup>
import { computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { formatTHB, formatGBP, thbToGbp } from '../composables/useCurrency'

const store = useExpensesStore()

const data = computed(() => {
  const now = new Date()
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const fmtKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

  const thisKey = fmtKey(thisMonth)
  const lastKey = fmtKey(lastMonth)
  const thisTHB = store.spentByMonth[thisKey] || 0
  const lastTHB = store.spentByMonth[lastKey] || 0

  // Day-of-month progress for "pace" comparison
  const dayOfMonth = now.getDate()
  const daysInLastMonth = new Date(
    lastMonth.getFullYear(),
    lastMonth.getMonth() + 1,
    0
  ).getDate()
  const lastSameDayTHB = store.expenses
    .filter((e) => {
      const d = new Date(e.date)
      return (
        d.getFullYear() === lastMonth.getFullYear() &&
        d.getMonth() === lastMonth.getMonth() &&
        d.getDate() <= dayOfMonth
      )
    })
    .reduce((s, e) => s + e.amountTHB, 0)

  const diff = thisTHB - lastTHB
  const diffPace = thisTHB - lastSameDayTHB

  return {
    thisMonth: {
      label: thisMonth.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric'
      }),
      gbp: thbToGbp(thisTHB),
      thb: thisTHB
    },
    lastMonth: {
      label: lastMonth.toLocaleDateString('en-GB', {
        month: 'long',
        year: 'numeric'
      }),
      gbp: thbToGbp(lastTHB),
      thb: lastTHB,
      sameDayGbp: thbToGbp(lastSameDayTHB),
      sameDayThb: lastSameDayTHB
    },
    diff: {
      gbp: thbToGbp(diff),
      thb: diff,
      percent: lastTHB > 0 ? (diff / lastTHB) * 100 : null
    },
    pace: {
      gbp: thbToGbp(diffPace),
      thb: diffPace,
      percent: lastSameDayTHB > 0 ? (diffPace / lastSameDayTHB) * 100 : null
    },
    progressPercent: Math.min(100, Math.max(0, (dayOfMonth / 31) * 100))
  }
})

const isUp = computed(() => data.value.diff.thb > 0)
const isPaceUp = computed(() => data.value.pace.thb > 0)

function fmtPercent(p) {
  if (p === null) return '—'
  const sign = p >= 0 ? '+' : ''
  return `${sign}${p.toFixed(1)}%`
}
</script>

<template>
  <div class="card">
    <div class="head">
      <h3>Month over Month</h3>
      <span class="sub">Comparing this month with last month</span>
    </div>

    <div class="cols">
      <div class="col">
        <p class="label">{{ data.thisMonth.label }}</p>
        <p class="value">{{ formatGBP(data.thisMonth.gbp) }}</p>
        <p class="thb">({{ formatTHB(data.thisMonth.thb) }})</p>
      </div>

      <div class="arrow" :class="isUp ? 'up' : 'down'">
        <span class="symbol">{{ isUp ? '▲' : '▼' }}</span>
        <span class="pct">{{ fmtPercent(data.diff.percent) }}</span>
        <span class="abs">
          {{ isUp ? '+' : '' }}{{ formatGBP(data.diff.gbp) }}
        </span>
      </div>

      <div class="col">
        <p class="label">{{ data.lastMonth.label }}</p>
        <p class="value muted">{{ formatGBP(data.lastMonth.gbp) }}</p>
        <p class="thb">({{ formatTHB(data.lastMonth.thb) }})</p>
      </div>
    </div>

    <div class="pace">
      <p class="pace-label">Same-day pace</p>
      <p class="pace-value">
        Through this point in {{ data.thisMonth.label }} you've spent
        <strong>{{ formatGBP(data.thisMonth.gbp) }}</strong>
        vs.
        <strong>{{ formatGBP(data.lastMonth.sameDayGbp) }}</strong>
        on the same day last month —
        <span :class="isPaceUp ? 'up' : 'down'">
          {{ fmtPercent(data.pace.percent) }}
        </span>
      </p>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}
.head {
  margin-bottom: 1.25rem;
}
.head h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: var(--color-text);
}
.sub {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.cols {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1.25rem;
  align-items: center;
}
.col {
  text-align: center;
}
.label {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  font-weight: 600;
}
.value {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--color-text);
}
.value.muted {
  color: var(--color-text-muted);
}
.thb {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--color-text-faded);
}
.arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 0.5rem;
}
.arrow .symbol {
  font-size: 1.4rem;
  line-height: 1;
  margin-bottom: 0.2rem;
}
.arrow.up {
  color: #dc2626;
}
.arrow.down {
  color: #059669;
}
.pct {
  font-size: 1rem;
  font-weight: 700;
}
.abs {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 0.25rem;
}
.pace {
  margin-top: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-light);
}
.pace-label {
  margin: 0 0 0.4rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  font-weight: 600;
}
.pace-value {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}
.pace-value strong {
  color: var(--color-text);
  font-weight: 600;
}
.up {
  color: #dc2626;
}
.down {
  color: #059669;
}
@media (max-width: 540px) {
  .cols {
    grid-template-columns: 1fr;
  }
}
</style>
