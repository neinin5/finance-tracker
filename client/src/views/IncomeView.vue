<script setup>
import { onMounted, computed, ref } from 'vue'
import { useIncomeStore } from '../stores/income'
import { useUiStore } from '../stores/ui'
import { useToastStore } from '../stores/toast'
import { formatGBP, formatTHB } from '../composables/useCurrency'

const store = useIncomeStore()
const ui = useUiStore()
const toast = useToastStore()

onMounted(() => store.fetchAll())

const search = ref('')
const filtered = computed(() => {
  if (!search.value.trim()) return store.incomes
  const q = search.value.toLowerCase()
  return store.incomes.filter((i) =>
    (i.description || '').toLowerCase().includes(q) ||
    (i.category || '').toLowerCase().includes(q) ||
    (i.note || '').toLowerCase().includes(q)
  )
})

const filteredTotalGBP = computed(() => filtered.value.reduce((s, i) => s + i.amountGBP, 0))
const filteredTotalTHB = computed(() => filtered.value.reduce((s, i) => s + i.amountTHB, 0))

const byCategory = computed(() => {
  const map = {}
  for (const i of filtered.value) {
    if (!map[i.category]) map[i.category] = { count: 0, gbp: 0, thb: 0 }
    map[i.category].count++
    map[i.category].gbp += i.amountGBP
    map[i.category].thb += i.amountTHB
  }
  return Object.entries(map)
    .map(([cat, v]) => ({ category: cat, ...v }))
    .sort((a, b) => b.thb - a.thb)
})

async function handleDelete(income) {
  if (!confirm(`Delete this income record (${formatGBP(income.amountGBP)})?`)) return
  try {
    await store.deleteIncome(income._id)
    toast.success('Income deleted')
  } catch (err) {
    toast.error(err.message || 'Delete failed')
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Income</h1>
        <p>{{ store.incomes.length }} record{{ store.incomes.length === 1 ? '' : 's' }}
          · total {{ formatGBP(store.totalIncomeGBP) }} ({{ formatTHB(store.totalIncomeTHB) }})
        </p>
      </div>
      <button class="primary" @click="ui.openIncomeModal">+ Add Income</button>
    </header>

    <div class="grid">
      <div class="card big">
        <div class="card-head">
          <span class="lbl">Total Income</span>
        </div>
        <p class="big-val">+{{ formatGBP(store.totalIncomeGBP) }}</p>
        <p class="big-sub">{{ formatTHB(store.totalIncomeTHB) }}</p>
      </div>

      <div class="card">
        <div class="card-head"><span class="lbl">By category</span></div>
        <div v-if="byCategory.length === 0" class="empty">No income recorded yet.</div>
        <ul v-else class="cats">
          <li v-for="c in byCategory" :key="c.category">
            <span class="cat-name">{{ c.category }}</span>
            <span class="cat-count">{{ c.count }}</span>
            <span class="cat-amt">{{ formatGBP(c.gbp) }}</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="list-card">
      <div class="list-head">
        <h3>All income records</h3>
        <input v-model="search" type="search" placeholder="Search…" />
      </div>
      <div v-if="filtered.length === 0" class="empty pad">
        {{ store.incomes.length === 0 ? 'No income recorded. Click + Add Income to start.' : 'No matches.' }}
      </div>
      <table v-else class="rows">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th class="num">GBP</th>
            <th class="num">THB</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in filtered" :key="i._id">
            <td class="dim">{{ new Date(i.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }}</td>
            <td><span class="pill">{{ i.category }}</span></td>
            <td class="desc">{{ i.description || '—' }}</td>
            <td class="num gbp">+{{ formatGBP(i.amountGBP) }}</td>
            <td class="num thb">+{{ formatTHB(i.amountTHB) }}</td>
            <td><button class="del" @click="handleDelete(i)" title="Delete">×</button></td>
          </tr>
        </tbody>
        <tfoot v-if="search">
          <tr>
            <td colspan="3" class="totals-lbl">Filtered total</td>
            <td class="num gbp">+{{ formatGBP(filteredTotalGBP) }}</td>
            <td class="num thb">+{{ formatTHB(filteredTotalTHB) }}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
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
.page-head h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--color-text); }
.page-head p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; }
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
.primary:hover { filter: brightness(1.1); }

.grid {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}
.card-head { margin-bottom: 0.5rem; }
.lbl {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
}
.card.big {
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border: none;
}
.card.big .lbl { color: rgba(255,255,255,0.8); }
.big-val { margin: 0; font-size: 1.7rem; font-weight: 700; letter-spacing: -0.02em; }
.big-sub { margin: 0.2rem 0 0; font-size: 0.85rem; opacity: 0.85; }

.cats { list-style: none; margin: 0; padding: 0; }
.cats li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 0.75rem;
  padding: 0.45rem 0;
  border-bottom: 1px solid var(--color-border-light);
  align-items: baseline;
  font-size: 0.85rem;
}
.cats li:last-child { border-bottom: none; }
.cat-name { color: var(--color-text); font-weight: 500; }
.cat-count {
  background: var(--color-surface-2);
  color: var(--color-text-muted);
  font-size: 0.7rem;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-weight: 600;
}
.cat-amt { color: #00bb77; font-weight: 700; }

.list-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
  gap: 1rem;
  flex-wrap: wrap;
}
.list-head h3 { margin: 0; font-size: 1rem; color: var(--color-text); }
.list-head input {
  border: 1px solid var(--color-border);
  background: var(--color-bg);
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--color-text);
  outline: none;
  min-width: 180px;
}
.list-head input:focus { border-color: var(--color-accent); }

.rows { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.rows th {
  text-align: left;
  padding: 0.55rem 1.25rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border-light);
}
.rows td {
  padding: 0.6rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text);
}
.rows tr:last-child td { border-bottom: none; }
.rows .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rows .gbp { color: #00bb77; font-weight: 700; }
.rows .thb { color: var(--color-text-muted); }
.rows .dim { color: var(--color-text-muted); white-space: nowrap; font-size: 0.8rem; }
.rows .desc {
  max-width: 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pill {
  display: inline-block;
  background: var(--color-info-bg);
  color: var(--color-info-text);
  border-radius: 999px;
  padding: 0.1rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}
.del {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-faded);
  width: 28px;
  height: 28px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  font-family: inherit;
  font-weight: 700;
  line-height: 1;
}
.del:hover {
  background: var(--color-error-bg);
  color: var(--color-error-text);
  border-color: var(--color-error-text);
}
.totals-lbl {
  text-align: right;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  font-weight: 700;
  background: var(--color-surface-2);
}
.empty { color: var(--color-text-faded); font-size: 0.9rem; }
.empty.pad { padding: 2rem; text-align: center; }

@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
  .rows .thb { display: none; }
  .rows th:nth-child(5) { display: none; }
}
</style>
