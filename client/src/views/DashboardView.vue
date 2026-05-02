<script setup>
import { useUiStore } from '../stores/ui'
import { useAuthStore } from '../stores/auth'
import BalanceCard from '../components/BalanceCard.vue'
import StatsRow from '../components/StatsRow.vue'
import SpendingTrendChart from '../components/SpendingTrendChart.vue'
import CategoryChart from '../components/CategoryChart.vue'
import ExpenseList from '../components/ExpenseList.vue'

const ui = useUiStore()
const auth = useAuthStore()
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Dashboard</h1>
        <p>Welcome back, {{ auth.user?.username }}.</p>
      </div>
      <button class="primary" @click="ui.openAddModal">+ Add Record</button>
    </header>

    <div class="stack">
      <BalanceCard />
      <StatsRow />

      <SpendingTrendChart initial-period="D" initial-type="line" />

      <CategoryChart />

      <ExpenseList :limit="10" title="Recent Expenses" />
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
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
.primary {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
}
.primary:hover {
  filter: brightness(1.1);
}
.stack {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
</style>
