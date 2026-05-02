<script setup>
import { ref, computed } from 'vue'
import { Line, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
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
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Tooltip,
  Legend
)

const PERIODS = [
  { key: 'D', label: 'Daily', count: 30 },
  { key: 'W', label: 'Weekly', count: 12 },
  { key: 'M', label: 'Monthly', count: 12 },
  { key: 'Y', label: 'Yearly', count: 5 }
]

const CHART_TYPES = [
  { key: 'line', label: 'Line' },
  { key: 'bar', label: 'Bar' },
  { key: 'area', label: 'Area' }
]

const props = defineProps({
  initialPeriod: { type: String, default: 'D' },
  initialType: { type: String, default: 'line' }
})

const period = ref(props.initialPeriod)
const chartType = ref(props.initialType)

const store = useExpensesStore()

function weekStartISO(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

const buckets = computed(() => {
  const result = []
  const today = new Date()
  const cfg = PERIODS.find((p) => p.key === period.value)
  const count = cfg.count

  for (let i = count - 1; i >= 0; i--) {
    let key, label, value

    if (period.value === 'D') {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      key = d.toISOString().slice(0, 10)
      label = d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short'
      })
      value = store.spentByDay[key] || 0
    } else if (period.value === 'W') {
      const d = new Date(today)
      d.setDate(d.getDate() - i * 7)
      key = weekStartISO(d.toISOString().slice(0, 10))
      label =
        'w/c ' +
        new Date(key).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short'
        })
      value = store.spentByWeek[key] || 0
    } else if (period.value === 'M') {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      label = d.toLocaleDateString('en-GB', {
        month: 'short',
        year: '2-digit'
      })
      value = store.spentByMonth[key] || 0
    } else {
      const year = today.getFullYear() - i
      key = String(year)
      label = key
      value = store.spentByYear[key] || 0
    }

    result.push({ key, label, value })
  }
  return result
})

const chartData = computed(() => {
  const isArea = chartType.value === 'area'
  const isLineish = chartType.value === 'line' || isArea
  return {
    labels: buckets.value.map((b) => b.label),
    datasets: [
      {
        label: 'Spending',
        data: buckets.value.map((b) => thbToGbp(b.value)),
        borderColor: '#667eea',
        backgroundColor: isArea
          ? 'rgba(102, 126, 234, 0.18)'
          : '#667eea',
        tension: 0.3,
        fill: isArea,
        pointRadius: isLineish ? 2 : 0,
        pointHoverRadius: isLineish ? 5 : 0,
        borderWidth: isLineish ? 2 : 0,
        borderRadius: isLineish ? 0 : 6,
        yAxisID: 'y'
      }
    ]
  }
})

const chartOptions = computed(() => {
  const data = chartData.value.datasets[0].data
  const maxGbp = data.length ? Math.max(...data, 1) * 1.15 : 100
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const gbp = ctx.parsed.y
            const thb = gbp * EXCHANGE_RATE_THB_PER_GBP
            return [`GBP ${formatGBP(gbp)}`, `(${formatTHB(thb)})`]
          }
        }
      }
    },
    scales: {
      y: {
        position: 'left',
        beginAtZero: true,
        max: maxGbp,
        title: {
          display: true,
          text: '£ GBP',
          color: '#667eea',
          font: { size: 11, weight: '600' }
        },
        ticks: { callback: (v) => '£' + Number(v).toLocaleString() }
      },
      y1: {
        position: 'right',
        beginAtZero: true,
        max: maxGbp * EXCHANGE_RATE_THB_PER_GBP,
        title: {
          display: true,
          text: '฿ THB',
          color: '#9ca3af',
          font: { size: 11 }
        },
        grid: { drawOnChartArea: false },
        ticks: {
          callback: (v) => '฿' + Math.round(Number(v)).toLocaleString()
        }
      },
      x: {
        ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 }
      }
    }
  }
})

const isEmpty = computed(() => store.expenses.length === 0)
</script>

<template>
  <div class="card">
    <div class="head">
      <h3>Spending Trend</h3>
      <div class="controls">
        <div class="seg">
          <button
            v-for="p in PERIODS"
            :key="p.key"
            :class="{ active: period === p.key }"
            @click="period = p.key"
          >
            {{ p.label }}
          </button>
        </div>
        <div class="seg">
          <button
            v-for="t in CHART_TYPES"
            :key="t.key"
            :class="{ active: chartType === t.key }"
            @click="chartType = t.key"
          >
            {{ t.label }}
          </button>
        </div>
      </div>
    </div>

    <div class="chart-wrap">
      <div v-if="isEmpty" class="empty">No data yet</div>
      <Line
        v-else-if="chartType === 'line' || chartType === 'area'"
        :data="chartData"
        :options="chartOptions"
      />
      <Bar v-else :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}
.head h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}
.controls {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.seg {
  display: flex;
  background: #f3f4f6;
  border-radius: 8px;
  padding: 0.2rem;
  gap: 0.15rem;
}
.seg button {
  background: transparent;
  border: none;
  padding: 0.4rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  font-family: inherit;
}
.seg button.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.seg button:hover:not(.active) {
  color: #374151;
}
.chart-wrap {
  height: 320px;
  position: relative;
}
.empty {
  height: 100%;
  display: grid;
  place-items: center;
  color: #9ca3af;
}
</style>
