<script setup>
import { ref, computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import {
  formatGBP,
  formatTHB,
  EXCHANGE_RATE_THB_PER_GBP
} from '../composables/useCurrency'

const store = useExpensesStore()

// ── Converter ──────────────────────────────────────────────────────────────
const converterGBP = ref('')
const converterTHB = ref('')

function onGBPInput(e) {
  const val = parseFloat(e.target.value)
  converterGBP.value = e.target.value
  converterTHB.value = isNaN(val) ? '' : (val * EXCHANGE_RATE_THB_PER_GBP).toFixed(2)
}
function onTHBInput(e) {
  const val = parseFloat(e.target.value)
  converterTHB.value = e.target.value
  converterGBP.value = isNaN(val) ? '' : (val / EXCHANGE_RATE_THB_PER_GBP).toFixed(2)
}

// ── Monthly data ───────────────────────────────────────────────────────────
const monthly = computed(() => {
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const lastDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastKey = `${lastDate.getFullYear()}-${String(lastDate.getMonth() + 1).padStart(2, '0')}`
  const thisTHB = store.spentByMonth[thisKey] || 0
  const lastTHB = store.spentByMonth[lastKey] || 0
  return { thisTHB, lastTHB, thisGBP: thisTHB / EXCHANGE_RATE_THB_PER_GBP, lastGBP: lastTHB / EXCHANGE_RATE_THB_PER_GBP }
})

const categories = computed(() =>
  Object.entries(store.spentByCategory)
    .map(([name, thb]) => ({ name, thb, gbp: thb / EXCHANGE_RATE_THB_PER_GBP }))
    .sort((a, b) => b.thb - a.thb)
)
const maxCatTHB = computed(() => categories.value.length ? categories.value[0].thb : 1)

const recent = computed(() =>
  [...store.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6)
)

const avgGBP = computed(() => store.expenses.length ? store.totalSpentGBP / store.expenses.length : 0)
const avgTHB = computed(() => store.expenses.length ? store.totalSpentTHB / store.expenses.length : 0)
const last30THB = computed(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return store.expenses
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .reduce((s, e) => s + e.amountTHB, 0)
})
const last30GBP = computed(() => last30THB.value / EXCHANGE_RATE_THB_PER_GBP)
const usedPct = computed(() => Math.min(100, (store.totalSpentTHB / store.initialFundTHB) * 100))

const stats = computed(() => [
  { label: 'This Month', gbp: monthly.value.thisGBP, thb: monthly.value.thisTHB },
  { label: 'Last Month', gbp: monthly.value.lastGBP, thb: monthly.value.lastTHB, muted: true },
  { label: 'Last 30d', gbp: last30GBP.value, thb: last30THB.value },
  { label: 'Avg / Item', gbp: avgGBP.value, thb: avgTHB.value },
  { label: 'Records', count: store.expenses.length }
])
</script>

<template>
  <div class="split">
    <!-- ── Header + Converter (one row) ──────────────────────── -->
    <header class="head">
      <div class="title">
        <h1>Split View</h1>
        <span class="rate">£1 = ฿{{ EXCHANGE_RATE_THB_PER_GBP }}</span>
      </div>
      <div class="converter">
        <div class="conv-input gbp">
          <span class="prefix">£</span>
          <input type="number" min="0" placeholder="GBP" :value="converterGBP" @input="onGBPInput" />
        </div>
        <span class="arrow">⇄</span>
        <div class="conv-input thb">
          <span class="prefix">฿</span>
          <input type="number" min="0" placeholder="THB" :value="converterTHB" @input="onTHBInput" />
        </div>
      </div>
    </header>

    <!-- ── Fund summary (compact 3-col) ──────────────────────── -->
    <div class="fund">
      <div class="fund-cell">
        <span class="lbl">Total</span>
        <span class="val gbp">{{ formatGBP(store.initialFundGBP) }}</span>
        <span class="sub">{{ formatTHB(store.initialFundTHB) }}</span>
      </div>
      <div class="fund-cell">
        <span class="lbl">Spent</span>
        <span class="val spent">{{ formatGBP(store.totalSpentGBP) }}</span>
        <span class="sub">{{ formatTHB(store.totalSpentTHB) }}</span>
      </div>
      <div class="fund-cell">
        <span class="lbl">Remaining</span>
        <span class="val rem">{{ formatGBP(store.remainingGBP) }}</span>
        <span class="sub">{{ formatTHB(store.remainingTHB) }}</span>
      </div>
      <div class="fund-bar">
        <div class="bar-fill" :style="{ width: usedPct + '%' }"></div>
        <span class="bar-label">{{ usedPct.toFixed(1) }}% used</span>
      </div>
    </div>

    <!-- ── Stats grid (compact) ──────────────────────────────── -->
    <div class="grid">
      <div class="panel">
        <div class="panel-head">
          <span>Statistics</span>
          <span class="hint">🇬🇧 £ · 🇹🇭 ฿</span>
        </div>
        <div class="stat-list">
          <div v-for="s in stats" :key="s.label" class="stat" :class="{ muted: s.muted }">
            <span class="s-label">{{ s.label }}</span>
            <span v-if="s.count != null" class="s-count">{{ s.count }}</span>
            <template v-else>
              <span class="s-gbp">{{ formatGBP(s.gbp) }}</span>
              <span class="s-thb">{{ formatTHB(s.thb) }}</span>
            </template>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-head">
          <span>By Category</span>
          <span class="hint">{{ categories.length }} total</span>
        </div>
        <div v-if="categories.length === 0" class="empty">No data</div>
        <div v-else class="cat-list">
          <div v-for="cat in categories.slice(0, 6)" :key="cat.name" class="cat">
            <div class="cat-name">{{ cat.name }}</div>
            <div class="cat-bar"><div :style="{ width: ((cat.thb / maxCatTHB) * 100) + '%' }"></div></div>
            <div class="cat-amounts">
              <span class="cat-gbp">{{ formatGBP(cat.gbp) }}</span>
              <span class="cat-thb">{{ formatTHB(cat.thb) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Recent (compact table) ────────────────────────────── -->
    <div class="panel">
      <div class="panel-head">
        <span>Recent</span>
        <span class="hint">last {{ recent.length }}</span>
      </div>
      <div v-if="recent.length === 0" class="empty">No expenses</div>
      <table v-else class="rec-table">
        <thead>
          <tr><th>Date</th><th>Description</th><th>Cat</th><th class="num">£</th><th class="num">฿</th></tr>
        </thead>
        <tbody>
          <tr v-for="e in recent" :key="e._id">
            <td class="dim">{{ new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</td>
            <td class="desc">{{ e.description }}</td>
            <td><span class="pill">{{ e.category }}</span></td>
            <td class="num gbp">{{ formatGBP(e.amountGBP) }}</td>
            <td class="num thb">{{ formatTHB(e.amountTHB) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.split {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  font-size: 0.85rem;
}

/* ── Header ───────────────────────────────────────────── */
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}
.title { display: flex; align-items: baseline; gap: 0.6rem; }
.title h1 { margin: 0; font-size: 1.15rem; color: var(--color-text); font-weight: 700; }
.rate {
  font-size: 0.7rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  color: var(--color-text-muted);
  font-weight: 600;
}
.converter {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.25rem;
  border-radius: 8px;
}
.conv-input {
  display: flex;
  align-items: center;
  background: var(--color-bg);
  border-radius: 6px;
  padding: 0 0.4rem;
}
.conv-input.gbp { border-left: 2px solid #1e3a8a; }
.conv-input.thb { border-left: 2px solid #00bb77; }
.conv-input .prefix { font-size: 0.78rem; color: var(--color-text-muted); font-weight: 600; padding-right: 0.25rem; }
.conv-input input {
  border: none;
  background: transparent;
  width: 80px;
  padding: 0.35rem 0;
  font-size: 0.85rem;
  color: var(--color-text);
  font-family: inherit;
  outline: none;
  font-weight: 600;
}
.arrow { color: var(--color-text-faded); font-size: 0.85rem; }

/* ── Fund row ─────────────────────────────────────────── */
.fund {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  position: relative;
}
.fund-cell {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border-right: 1px solid var(--color-border-light);
  padding-right: 0.75rem;
}
.fund-cell:last-of-type { border-right: none; padding-right: 0; }
.fund .lbl {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
}
.fund .val { font-size: 1.05rem; font-weight: 700; color: var(--color-text); letter-spacing: -0.01em; }
.fund .val.spent { color: #dc2626; }
.fund .val.rem { color: #00bb77; }
.fund .sub { font-size: 0.72rem; color: var(--color-text-faded); }
.fund-bar {
  grid-column: 1 / -1;
  height: 5px;
  background: var(--color-bg);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  margin-top: 0.15rem;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #00bb77, #008855);
  border-radius: 999px;
  transition: width 0.5s ease;
}
.bar-label {
  position: absolute;
  right: 0;
  top: 6px;
  font-size: 0.65rem;
  color: var(--color-text-faded);
  font-weight: 600;
}

/* ── 2-col grid (stats + categories) ──────────────────── */
.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr);
  gap: 0.75rem;
}

.panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
}
.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.85rem;
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border-light);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text);
}
.panel-head .hint {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-transform: none;
  letter-spacing: 0;
}

/* ── Stat list ─────────────────────────────────────────── */
.stat-list { display: flex; flex-direction: column; }
.stat {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.85rem;
  border-bottom: 1px solid var(--color-border-light);
}
.stat:last-child { border-bottom: none; }
.stat.muted .s-gbp, .stat.muted .s-thb { opacity: 0.55; }
.s-label { font-size: 0.78rem; color: var(--color-text-muted); }
.s-gbp { font-size: 0.82rem; font-weight: 700; color: #1e3a8a; min-width: 60px; text-align: right; }
.s-thb { font-size: 0.78rem; color: #00bb77; font-weight: 600; min-width: 70px; text-align: right; }
.s-count { font-size: 0.95rem; font-weight: 700; color: var(--color-text); grid-column: 2 / 4; text-align: right; }

/* ── Categories ────────────────────────────────────────── */
.cat-list { display: flex; flex-direction: column; }
.cat {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  align-items: center;
  gap: 0.6rem;
  padding: 0.4rem 0.85rem;
  border-bottom: 1px solid var(--color-border-light);
}
.cat:last-child { border-bottom: none; }
.cat-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cat-bar {
  height: 4px;
  background: var(--color-bg);
  border-radius: 999px;
  overflow: hidden;
}
.cat-bar > div {
  height: 100%;
  background: linear-gradient(90deg, #00bb77, #008855);
  border-radius: 999px;
  transition: width 0.4s ease;
}
.cat-amounts {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  line-height: 1.15;
}
.cat-gbp { font-size: 0.78rem; font-weight: 700; color: #1e3a8a; }
.cat-thb { font-size: 0.68rem; color: var(--color-text-faded); }

/* ── Recent table ──────────────────────────────────────── */
.rec-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}
.rec-table th {
  text-align: left;
  padding: 0.4rem 0.85rem;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  background: var(--color-surface-2);
  border-bottom: 1px solid var(--color-border-light);
}
.rec-table td {
  padding: 0.4rem 0.85rem;
  border-bottom: 1px solid var(--color-border-light);
  color: var(--color-text);
}
.rec-table tr:last-child td { border-bottom: none; }
.rec-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.rec-table .gbp { color: #1e3a8a; font-weight: 700; }
.rec-table .thb { color: #00bb77; font-weight: 600; }
.rec-table .dim { color: var(--color-text-muted); white-space: nowrap; font-size: 0.75rem; }
.rec-table .desc {
  max-width: 0;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pill {
  display: inline-block;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.05rem 0.45rem;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.empty {
  text-align: center;
  padding: 1.25rem;
  color: var(--color-text-faded);
  font-size: 0.8rem;
}

@media (max-width: 720px) {
  .grid { grid-template-columns: 1fr; }
  .fund { grid-template-columns: 1fr; gap: 0.5rem; }
  .fund-cell { border-right: none; border-bottom: 1px solid var(--color-border-light); padding: 0 0 0.4rem; flex-direction: row; justify-content: space-between; align-items: baseline; }
  .head { flex-direction: column; align-items: stretch; }
  .converter { justify-content: center; }
  .rec-table .thb { display: none; }
  .rec-table th:last-child { display: none; }
}
</style>
