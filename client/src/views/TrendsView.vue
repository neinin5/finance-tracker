<script setup>
import SpendingTrendChart from '../components/SpendingTrendChart.vue'
import CategoryChart from '../components/CategoryChart.vue'
</script>

<template>
  <div>
    <header class="page-head">
      <h1>Spending Trends</h1>
      <p>
        Switch period (Daily / Weekly / Monthly / Yearly) and chart type
        (Line / Bar / Area). Primary scale is GBP, secondary is THB.
      </p>
    </header>

    <div class="stack">
      <SpendingTrendChart initial-period="M" initial-type="bar" />
      <CategoryChart />
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
  max-width: 60ch;
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
