<script setup>
import { ref, computed } from 'vue'
import { Doughnut, Pie, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'
import { useExpensesStore } from '../stores/expenses'
import {
  formatTHB,
  formatGBP,
  thbToGbp,
  EXCHANGE_RATE_THB_PER_GBP
} from '../composables/useCurrency'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
)

const store = useExpensesStore()

const TYPES = [
  { key: 'doughnut', label: 'Donut' },
  { key: 'pie', label: 'Pie' },
  { key: 'bar', label: 'Bar' }
]
const chartType = ref('doughnut')

const COLORS = [
  '#00bb77',
  '#008855',
  '#2ddb95',
  '#0ea5e9',
  '#6366f1',
  '#f59e0b',
  '#ec4899',
  '#14b8a6',
  '#84cc16',
  '#a78bfa'
]

const sortedEntries = computed(() =>
  Object.entries(store.spentByCategory).sort((a, b) => b[1] - a[1])
)

const chartData = computed(() => {
  const entries = sortedEntries.value
  const isBar = chartType.value === 'bar'
  return {
    labels: entries.map(([k]) => k),
    datasets: [
      {
        label: 'Spent (GBP)',
        data: entries.map(([, v]) => thbToGbp(v)),
        backgroundColor: COLORS.slice(0, entries.length),
        borderWidth: isBar ? 0 : 2,
        borderColor:
          getComputedStyle(document.documentElement).getPropertyValue(
            '--color-surface'
          ) || 'white',
        borderRadius: isBar ? 6 : 0
      }
    ]
  }
})

const chartOptions = computed(() => {
  const isBar = chartType.value === 'bar'
  return {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: isBar ? 'y' : 'x',
    plugins: {
      legend: isBar
        ? { display: false }
        : { position: 'right', labels: { boxWidth: 14, padding: 12 } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const gbp = isBar ? ctx.parsed.x : ctx.parsed
            const thb = gbp * EXCHANGE_RATE_THB_PER_GBP
            return [`${ctx.label}`, `GBP ${formatGBP(gbp)}`, `(${formatTHB(thb)})`]
          }
        }
      }
    },
    scales: isBar
      ? {
          x: {
            beginAtZero: true,
            ticks: { callback: (v) => '£' + Number(v).toFixed(0) }
          }
        }
      : {}
  }
})

const isEmpty = computed(() => store.expenses.length === 0)
</script>

<template>
  <div class="card">
    <div class="head">
      <h3>Spending by Category</h3>
      <div class="seg">
        <button
          v-for="t in TYPES"
          :key="t.key"
          :class="{ active: chartType === t.key }"
          @click="chartType = t.key"
        >
          {{ t.label }}
        </button>
      </div>
    </div>
    <div class="chart-wrap">
      <div v-if="isEmpty" class="empty">No data yet</div>
      <Doughnut
        v-else-if="chartType === 'doughnut'"
        :data="chartData"
        :options="chartOptions"
      />
      <Pie
        v-else-if="chartType === 'pie'"
        :data="chartData"
        :options="chartOptions"
      />
      <Bar v-else :data="chartData" :options="chartOptions" />
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.head h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1rem;
}
.seg {
  display: flex;
  background: var(--color-surface-3);
  border-radius: 8px;
  padding: 0.2rem;
  gap: 0.15rem;
}
.seg button {
  background: transparent;
  border: none;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--color-text-muted);
  font-family: inherit;
}
.seg button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
.chart-wrap {
  height: 320px;
  position: relative;
}
.empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--color-text-faded);
}
</style>
