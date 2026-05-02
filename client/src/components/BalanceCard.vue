<script setup>
import { computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { formatTHB, formatGBP } from '../composables/useCurrency'

const store = useExpensesStore()

const usedPercent = computed(() =>
  Math.min(100, Math.max(0, (store.totalSpentTHB / store.initialFundTHB) * 100))
)
const usedPercentDisplay = computed(() => usedPercent.value.toFixed(1))
</script>

<template>
  <div class="balance-card">
    <div class="header">
      <h2>Remaining Scholarship Fund</h2>
      <span class="rate">£1 = ฿{{ store.exchangeRate }}</span>
    </div>

    <div class="amounts">
      <div class="primary">{{ formatGBP(store.remainingGBP) }}</div>
      <div class="secondary">({{ formatTHB(store.remainingTHB) }})</div>
    </div>

    <div class="progress" :title="`${usedPercentDisplay}% used`">
      <div class="bar" :style="{ width: usedPercent + '%' }"></div>
    </div>

    <div class="meta">
      <span>{{ usedPercentDisplay }}% used</span>
      <span>
        {{ formatGBP(store.totalSpentGBP) }} of
        {{ formatGBP(store.initialFundGBP) }}
        <span class="thb-meta">({{ formatTHB(store.initialFundTHB) }})</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.balance-card {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(102, 126, 234, 0.25);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  opacity: 0.95;
  gap: 1rem;
  flex-wrap: wrap;
}
.header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
}
.rate {
  font-size: 0.85rem;
  background: rgba(255, 255, 255, 0.18);
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
}
.amounts {
  margin: 1.25rem 0;
}
.primary {
  font-size: 2.5rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.secondary {
  font-size: 1rem;
  opacity: 0.8;
  margin-top: 0.4rem;
  font-weight: 400;
}
.progress {
  height: 10px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 999px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: white;
  border-radius: 999px;
  transition: width 0.4s ease;
}
.meta {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  opacity: 0.85;
  gap: 1rem;
  flex-wrap: wrap;
}
.thb-meta {
  opacity: 0.7;
  margin-left: 0.25rem;
}
</style>
