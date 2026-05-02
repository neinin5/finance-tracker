<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
} from 'chart.js'
import { useExchangeRateStore } from '../stores/exchangeRate'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
)

const store = useExchangeRateStore()

const chartData = computed(() => ({
  labels: store.rates.map((r) =>
    new Date(r.date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short'
    })
  ),
  datasets: [
    {
      label: 'GBP → THB',
      data: store.rates.map((r) => r.rate),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      tension: 0.3,
      fill: true,
      pointRadius: 2,
      pointHoverRadius: 5,
      borderWidth: 2
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
        label: (ctx) => `£1 = ฿${ctx.parsed.y.toFixed(3)}`
      }
    }
  },
  scales: {
    y: {
      ticks: { callback: (v) => '฿' + Number(v).toFixed(2) }
    },
    x: {
      ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 10 }
    }
  }
}

const isEmpty = computed(() => store.rates.length === 0)
</script>

<template>
  <div class="chart-wrap">
    <div v-if="isEmpty" class="empty">
      {{ store.loading ? 'Loading rates…' : 'No data available' }}
    </div>
    <Line v-else :data="chartData" :options="chartOptions" />
  </div>
</template>

<style scoped>
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
