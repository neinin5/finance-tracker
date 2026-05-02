<script setup>
import { onMounted, ref, computed } from 'vue'
import { useExchangeRateStore } from '../stores/exchangeRate'
import ExchangeRateChart from '../components/ExchangeRateChart.vue'

const store = useExchangeRateStore()
const days = ref(30)

onMounted(() => store.fetchHistory(days.value))

const lastUpdated = computed(() => {
  if (!store.fetchedAt) return null
  return new Date(store.fetchedAt).toLocaleString('en-GB')
})

function changeDays(n) {
  days.value = n
  store.fetchHistory(n)
}
</script>

<template>
  <div>
    <header class="page-head">
      <h1>GBP / THB Exchange Rate</h1>
      <p>Live mid-market rate sourced from frankfurter.app, cached daily.</p>
    </header>

    <section class="summary">
      <div class="card big">
        <p class="label">Latest market rate</p>
        <p v-if="store.latest" class="value">
          £1 = ฿{{ store.latest.rate.toFixed(3) }}
        </p>
        <p v-else class="value muted">—</p>
        <p
          v-if="store.change !== null"
          class="change"
          :class="store.change >= 0 ? 'up' : 'down'"
        >
          {{ store.change >= 0 ? '+' : '' }}{{ store.change.toFixed(3) }} ({{
            store.changePercent.toFixed(2)
          }}%) vs previous day
        </p>
        <p v-if="store.latest" class="meta">As of {{ store.latest.date }}</p>
      </div>

      <div class="card">
        <p class="label">App budget rate</p>
        <p class="value">£1 = ฿45.000</p>
        <p class="meta">Fixed conversion used for budget calculations</p>
      </div>
    </section>

    <div class="card chart-card">
      <div class="chart-head">
        <h3>Rate history</h3>
        <div class="ranges">
          <button
            v-for="n in [7, 30, 90]"
            :key="n"
            :class="{ active: days === n }"
            @click="changeDays(n)"
          >
            {{ n }}d
          </button>
        </div>
      </div>
      <ExchangeRateChart />
      <p v-if="lastUpdated" class="footer-note">
        Last refresh from upstream: {{ lastUpdated }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 1.5rem;
}
.page-head h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  color: #1f2937;
}
.page-head p {
  margin: 0;
  color: #6b7280;
  font-size: 0.9rem;
}
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}
.card .label {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.card .value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: #1f2937;
}
.card .value.muted {
  color: #9ca3af;
}
.card .meta {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: #9ca3af;
}
.change {
  margin: 0.5rem 0 0;
  font-size: 0.9rem;
  font-weight: 500;
}
.change.up {
  color: #047857;
}
.change.down {
  color: #b91c1c;
}
.big .value {
  background: linear-gradient(90deg, #10b981, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.chart-card {
  padding-bottom: 1rem;
}
.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.chart-head h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}
.ranges {
  display: flex;
  gap: 0.25rem;
  background: #f3f4f6;
  padding: 0.2rem;
  border-radius: 8px;
}
.ranges button {
  background: transparent;
  border: none;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  font-family: inherit;
}
.ranges button.active {
  background: white;
  color: #1f2937;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.footer-note {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: right;
}
</style>
