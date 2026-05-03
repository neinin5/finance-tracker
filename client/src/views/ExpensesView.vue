<script setup>
import { ref } from 'vue'
import { useUiStore } from '../stores/ui'
import { download } from '../api/client'
import ExpenseList from '../components/ExpenseList.vue'

const ui = useUiStore()

const exporting = ref('')
const exportError = ref('')

async function handleExport(format) {
  if (exporting.value) return
  exporting.value = format
  exportError.value = ''
  const date = new Date().toISOString().slice(0, 10)
  try {
    await download(`/export/${format}`, `expenses-${date}.${format}`)
  } catch (err) {
    exportError.value = `Export failed: ${err.message}`
  } finally {
    exporting.value = ''
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>All Records</h1>
        <p>Search, filter, and export your full expense history.</p>
      </div>
      <div class="actions">
        <button
          class="ghost"
          :disabled="exporting === 'csv'"
          @click="handleExport('csv')"
        >
          {{ exporting === 'csv' ? 'Exporting…' : 'Export CSV' }}
        </button>
        <button
          class="ghost"
          :disabled="exporting === 'pdf'"
          @click="handleExport('pdf')"
        >
          {{ exporting === 'pdf' ? 'Exporting…' : 'Export PDF' }}
        </button>
        <button class="primary" @click="ui.openAddModal">+ Add Record</button>
      </div>
    </header>

    <p v-if="exportError" class="error">{{ exportError }}</p>

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
  color: var(--color-text);
}
.page-head p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ghost {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  font-family: inherit;
  font-size: 0.9rem;
}
.ghost:hover:not(:disabled) {
  background: var(--color-surface-2);
  color: var(--color-text);
}
.ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.primary {
  padding: 0.6rem 1rem;
  background: linear-gradient(135deg, #00bb77, #008855);
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
.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  margin: 0 0 1rem;
  font-size: 0.875rem;
}
</style>
