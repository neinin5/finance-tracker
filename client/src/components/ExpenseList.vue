<script setup>
import { computed, ref } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { formatTHB, formatGBP } from '../composables/useCurrency'

const props = defineProps({
  limit: { type: Number, default: null },
  title: { type: String, default: 'Expense History' }
})

const store = useExpensesStore()
const filter = ref('')

const sortedExpenses = computed(() => {
  const list = [...store.expenses].sort(
    (a, b) =>
      new Date(b.date) - new Date(a.date) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  )
  let filtered = list
  if (filter.value) {
    const q = filter.value.toLowerCase()
    filtered = list.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
    )
  }
  return props.limit ? filtered.slice(0, props.limit) : filtered
})

const showingCount = computed(() => sortedExpenses.value.length)
const totalCount = computed(() => store.expenses.length)

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

async function handleDelete(id) {
  if (!confirm('Delete this expense? This cannot be undone.')) return
  try {
    await store.deleteExpense(id)
  } catch (err) {
    alert('Could not delete: ' + err.message)
  }
}
</script>

<template>
  <div class="card">
    <div class="header">
      <div>
        <h3>{{ title }}</h3>
        <p v-if="limit && totalCount > limit" class="meta">
          Showing {{ showingCount }} of {{ totalCount }}
        </p>
      </div>
      <input
        v-if="!limit"
        v-model="filter"
        type="search"
        placeholder="Search…"
        class="search"
      />
    </div>

    <div v-if="!sortedExpenses.length" class="empty">
      <p v-if="!filter">
        No expenses recorded yet. Add your first one to get started!
      </p>
      <p v-else>No expenses match "{{ filter }}".</p>
    </div>

    <ul v-else class="list">
      <li v-for="e in sortedExpenses" :key="e._id">
        <div class="row">
          <div class="info">
            <p class="category">
              {{ e.category }}
              <span v-if="e.source === 'google-sheet'" class="badge">sheet</span>
            </p>
            <p class="desc">{{ e.description || '—' }}</p>
            <p class="date">{{ formatDate(e.date) }}</p>
          </div>
          <div class="amount">
            <p class="gbp">{{ formatGBP(e.amountGBP) }}</p>
            <p class="thb">{{ formatTHB(e.amountTHB) }}</p>
          </div>
          <button
            class="delete"
            @click="handleDelete(e._id)"
            aria-label="Delete expense"
            title="Delete"
          >
            ×
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
}
.header h3 {
  margin: 0;
  color: #1f2937;
  font-size: 1.1rem;
}
.meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: #9ca3af;
}
.search {
  padding: 0.45rem 0.7rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  width: 160px;
}
.search:focus {
  outline: none;
  border-color: #667eea;
}
.empty {
  text-align: center;
  color: #6b7280;
  padding: 2.5rem 1rem;
  background: #f9fafb;
  border-radius: 8px;
}
.empty p {
  margin: 0;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 480px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}
.row:hover {
  border-color: #e5e7eb;
}
.info {
  flex: 1;
  min-width: 0;
}
.info p {
  margin: 0;
}
.category {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.badge {
  font-size: 0.65rem;
  font-weight: 600;
  background: #eef2ff;
  color: #4338ca;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.desc {
  font-size: 0.85rem;
  color: #6b7280;
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.date {
  font-size: 0.75rem;
  color: #9ca3af;
  margin-top: 0.15rem;
}
.amount {
  text-align: right;
  flex-shrink: 0;
}
.amount p {
  margin: 0;
}
.gbp {
  font-weight: 600;
  color: #1f2937;
}
.thb {
  font-size: 0.8rem;
  color: #6b7280;
  margin-top: 0.15rem;
}
.delete {
  background: transparent;
  color: #9ca3af;
  border: none;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  flex-shrink: 0;
  transition: background 0.15s, color 0.15s;
}
.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}
</style>
