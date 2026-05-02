<script setup>
import SpendingHeatmap from '../components/SpendingHeatmap.vue'
</script>

<template>
  <div>
    <header class="page-head">
      <h1>Spending Calendar</h1>
      <p>
        A year-at-a-glance heatmap of daily spending. Hover any cell to see the
        date and amount in both currencies.
      </p>
    </header>

    <SpendingHeatmap :weeks="53" />
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
  max-width: 60ch;
}
</style>
