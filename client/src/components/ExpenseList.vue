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
const dateFrom = ref('')
const dateTo = ref('')
const minAmount = ref('')
const maxAmount = ref('')
const sourceFilter = ref('all')
const filtersOpen = ref(false)

const filteredAll = computed(() => {
  let list = [...store.expenses]
  if (filter.value) {
    const q = filter.value.toLowerCase()
    list = list.filter(
      (e) =>
        e.category.toLowerCase().includes(q) ||
        (e.description || '').toLowerCase().includes(q) ||
        (e.note || '').toLowerCase().includes(q)
    )
  }
  if (dateFrom.value) list = list.filter((e) => e.date >= dateFrom.value)
  if (dateTo.value) list = list.filter((e) => e.date <= dateTo.value)
  if (minAmount.value !== '') {
    const min = Number(minAmount.value)
    if (!isNaN(min)) list = list.filter((e) => e.amountGBP >= min)
  }
  if (maxAmount.value !== '') {
    const max = Number(maxAmount.value)
    if (!isNaN(max)) list = list.filter((e) => e.amountGBP <= max)
  }
  if (sourceFilter.value === 'manual')
    list = list.filter((e) => e.source !== 'google-sheet')
  else if (sourceFilter.value === 'sheet')
    list = list.filter((e) => e.source === 'google-sheet')

  list.sort(
    (a, b) =>
      new Date(b.date) - new Date(a.date) ||
      new Date(b.createdAt) - new Date(a.createdAt)
  )
  return list
})

const sortedExpenses = computed(() =>
  props.limit ? filteredAll.value.slice(0, props.limit) : filteredAll.value
)

const showingCount = computed(() => sortedExpenses.value.length)
const totalCount = computed(() => store.expenses.length)
const filteredCount = computed(() => filteredAll.value.length)

const filteredTotalGBP = computed(() =>
  filteredAll.value.reduce((s, e) => s + e.amountGBP, 0)
)
const filteredTotalTHB = computed(() =>
  filteredAll.value.reduce((s, e) => s + e.amountTHB, 0)
)

const hasFilters = computed(
  () =>
    filter.value ||
    dateFrom.value ||
    dateTo.value ||
    minAmount.value !== '' ||
    maxAmount.value !== '' ||
    sourceFilter.value !== 'all'
)

function clearFilters() {
  filter.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  minAmount.value = ''
  maxAmount.value = ''
  sourceFilter.value = 'all'
}

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
        <p v-else-if="!limit && hasFilters" class="meta">
          {{ filteredCount }} of {{ totalCount }} ·
          {{ formatGBP(filteredTotalGBP) }} ({{ formatTHB(filteredTotalTHB) }})
        </p>
      </div>
      <div v-if="!limit" class="header-actions">
        <input
          v-model="filter"
          type="search"
          placeholder="Search…"
          class="search"
        />
        <button
          class="filter-toggle"
          :class="{ active: filtersOpen || hasFilters }"
          @click="filtersOpen = !filtersOpen"
        >
          Filters{{ hasFilters ? ' ·' : '' }}
        </button>
      </div>
    </div>

    <div v-if="!limit && filtersOpen" class="filters">
      <label>
        From
        <input v-model="dateFrom" type="date" />
      </label>
      <label>
        To
        <input v-model="dateTo" type="date" />
      </label>
      <label>
        Min £
        <input v-model="minAmount" type="number" step="0.01" placeholder="0" />
      </label>
      <label>
        Max £
        <input
          v-model="maxAmount"
          type="number"
          step="0.01"
          placeholder="∞"
        />
      </label>
      <label>
        Source
        <select v-model="sourceFilter">
          <option value="all">All</option>
          <option value="manual">Manually added</option>
          <option value="sheet">From Google Sheet</option>
        </select>
      </label>
      <button class="clear" v-if="hasFilters" @click="clearFilters">
        Clear filters
      </button>
    </div>

    <div v-if="!sortedExpenses.length" class="empty">
      <p v-if="!hasFilters && !filter">
        No expenses recorded yet. Add your first one to get started!
      </p>
      <p v-else>No expenses match your filters.</p>
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
            <p class="thb">({{ formatTHB(e.amountTHB) }})</p>
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
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1rem;
}
.meta {
  margin: 0.2rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-faded);
}
.header-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
}
.search {
  padding: 0.45rem 0.7rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
  font-family: inherit;
  width: 160px;
  background: var(--color-surface);
  color: var(--color-text);
}
.search:focus {
  outline: none;
  border-color: var(--color-accent);
}
.filter-toggle {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  padding: 0.45rem 0.7rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
}
.filter-toggle.active {
  background: var(--color-info-bg);
  color: var(--color-info-text);
  border-color: transparent;
}
.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  padding: 1rem;
  background: var(--color-surface-2);
  border-radius: 8px;
  margin-bottom: 1rem;
  align-items: end;
}
.filters label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.filters input,
.filters select {
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
.filters input:focus,
.filters select:focus {
  outline: none;
  border-color: var(--color-accent);
}
.clear {
  padding: 0.45rem 0.7rem;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-family: inherit;
  align-self: end;
}
.empty {
  text-align: center;
  color: var(--color-text-muted);
  padding: 2.5rem 1rem;
  background: var(--color-surface-2);
  border-radius: 8px;
}
.empty p {
  margin: 0;
}
.list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 600px;
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
  background: var(--color-surface-2);
  border-radius: 8px;
  border: 1px solid transparent;
  transition: border-color 0.15s;
}
.row:hover {
  border-color: var(--color-border);
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
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.badge {
  font-size: 0.65rem;
  font-weight: 600;
  background: var(--color-info-bg);
  color: var(--color-info-text);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.desc {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.15rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.date {
  font-size: 0.75rem;
  color: var(--color-text-faded);
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
  color: var(--color-text);
}
.thb {
  font-size: 0.8rem;
  color: var(--color-text-faded);
  margin-top: 0.15rem;
}
.delete {
  background: transparent;
  color: var(--color-text-faded);
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
  background: var(--color-error-bg);
  color: var(--color-error-text);
}
</style>
