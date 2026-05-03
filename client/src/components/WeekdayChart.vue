<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js'
import { useExpensesStore } from '../stores/expenses'
import { thbToGbp, formatGBP, formatTHB } from '../composables/useCurrency'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const store = useExpensesStore()

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const data = computed(() => {
  // sum + count by day-of-week (0=Mon)
  const totalsTHB = [0, 0, 0, 0, 0, 0, 0]
  const counts = [0, 0, 0, 0, 0, 0, 0]
  for (const e of store.expenses) {
    const d = new Date(e.date + 'T00:00:00Z')
    const dow = (d.getUTCDay() + 6) % 7 // shift Sun(0)→6, Mon(1)→0…
    totalsTHB[dow] += e.amountTHB
    counts[dow] += 1
  }
  const avgGBP = totalsTHB.map((t, i) => (counts[i] ? thbToGbp(t / counts[i]) : 0))
  const totalGBP = totalsTHB.map((t) => thbToGbp(t))
  return { avgGBP, totalGBP, totalsTHB, counts }
})

const chartData = computed(() => ({
  labels: DAY_NAMES,
  datasets: [
    {
      label: 'Avg per day',
      data: data.value.avgGBP,
      backgroundColor: data.value.avgGBP.map((_, i) =>
        i >= 5 ? 'rgba(0, 187, 119, 0.55)' : 'rgba(0, 187, 119, 0.85)'
      ),
      borderRadius: 6,
      borderSkipped: false
    }
  ]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => {
          const i = ctx.dataIndex
          const avg = data.value.avgGBP[i]
          const total = data.value.totalGBP[i]
          const count = data.value.counts[i]
          return [
            `Avg: ${formatGBP(avg)} (${formatTHB(avg * 45)})`,
            `Total: ${formatGBP(total)} from ${count} expense${count === 1 ? '' : 's'}`
          ]
        }
      }
    }
  },
  scales: {
    x: { grid: { display: false } },
    y: {
      beginAtZero: true,
      ticks: { callback: (v) => '£' + Number(v).toFixed(0) }
    }
  }
}

const isEmpty = computed(() => store.expenses.length === 0)
const peakDay = computed(() => {
  if (isEmpty.value) return null
  const max = Math.max(...data.value.avgGBP)
  if (max === 0) return null
  return DAY_NAMES[data.value.avgGBP.indexOf(max)]
})
</script>

<template>
  <div class="card">
    <div class="head">
      <div>
        <h3>Weekday Pattern</h3>
        <p class="sub">Average spending by day of week</p>
      </div>
      <span v-if="peakDay" class="badge">Peak: {{ peakDay }}</span>
    </div>
    <div class="chart-wrap">
      <div v-if="isEmpty" class="empty">No data yet</div>
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
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
}
.head h3 {
  margin: 0 0 0.2rem;
  color: var(--color-text);
  font-size: 1.1rem;
}
.sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.badge {
  background: var(--color-info-bg);
  color: var(--color-info-text);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
}
.chart-wrap {
  height: 240px;
  position: relative;
}
.empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--color-text-faded);
}
</style>
