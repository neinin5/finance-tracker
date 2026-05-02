<script setup>
import { computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { formatTHB, formatGBP, thbToGbp } from '../composables/useCurrency'

const store = useExpensesStore()

const stats = computed(() => {
  const count = store.expenses.length
  const avgTHB = count ? store.totalSpentTHB / count : 0
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  const recent = store.expenses.filter(
    (e) => new Date(e.date).getTime() >= cutoff
  )
  const recentTHB = recent.reduce((s, e) => s + e.amountTHB, 0)

  return [
    {
      label: 'Records',
      value: String(count),
      sub: 'total expenses'
    },
    {
      label: 'Total Spent',
      value: formatGBP(store.totalSpentGBP),
      sub: `(${formatTHB(store.totalSpentTHB)})`
    },
    {
      label: 'Last 30 Days',
      value: formatGBP(thbToGbp(recentTHB)),
      sub: `(${formatTHB(recentTHB)}) · ${recent.length} expense${
        recent.length === 1 ? '' : 's'
      }`
    },
    {
      label: 'Average / Expense',
      value: count ? formatGBP(thbToGbp(avgTHB)) : '—',
      sub: count ? `(${formatTHB(avgTHB)})` : 'no data'
    }
  ]
})
</script>

<template>
  <div class="stats-row">
    <div v-for="s in stats" :key="s.label" class="stat">
      <p class="label">{{ s.label }}</p>
      <p class="value">{{ s.value }}</p>
      <p class="sub">{{ s.sub }}</p>
    </div>
  </div>
</template>

<style scoped>
.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}
.stat {
  background: white;
  padding: 1.25rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.label {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.value {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}
.sub {
  margin: 0;
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
