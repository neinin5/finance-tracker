<script setup>
import { useUiStore } from '../stores/ui'
import ExpenseList from '../components/ExpenseList.vue'

const ui = useUiStore()
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>All Records</h1>
        <p>Every expense you've logged or imported.</p>
      </div>
      <button class="primary" @click="ui.openAddModal">+ Add Record</button>
    </header>

    <ExpenseList />
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
</style>
