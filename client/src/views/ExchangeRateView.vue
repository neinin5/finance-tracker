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
  color: var(--color-text);
}
.page-head p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.card {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}
.card .label {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}
.card .value {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}
.card .value.muted {
  color: var(--color-text-faded);
}
.card .meta {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-faded);
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
  color: var(--color-text);
}
.ranges {
  display: flex;
  gap: 0.25rem;
  background: var(--color-surface-3);
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
  color: var(--color-text-muted);
  font-family: inherit;
}
.ranges button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
.footer-note {
  margin: 0.75rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-faded);
  text-align: right;
}
</style>
