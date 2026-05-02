<script setup>
import { onMounted } from 'vue'
import Sidebar from '../components/Sidebar.vue'
import AddExpenseModal from '../components/AddExpenseModal.vue'
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'

const ui = useUiStore()
const expenseStore = useExpensesStore()

onMounted(() => {
  if (!expenseStore.expenses.length) expenseStore.fetchAll()
})
</script>

<template>
  <div class="layout">
    <Sidebar />

    <button
      class="hamburger"
      aria-label="Open menu"
      @click="ui.toggleSidebar"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

    <div
      v-if="ui.sidebarOpen"
      class="backdrop"
      @click="ui.closeSidebar"
    ></div>

    <main class="content">
      <router-view />
    </main>

    <AddExpenseModal />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}
.content {
  flex: 1;
  min-width: 0;
  padding: 2rem;
}
.hamburger {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 30;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 0;
}
.hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
}
.backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  z-index: 35;
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }
  .backdrop {
    display: block;
  }
  .content {
    padding: 4rem 1rem 1rem;
  }
}
</style>
