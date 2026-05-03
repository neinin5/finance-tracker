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

// ── Category data ──────────────────────────────────────────────────────────
const categories = computed(() => {
  return Object.entries(store.spentByCategory)
    .map(([name, thb]) => ({ name, thb, gbp: thb / EXCHANGE_RATE_THB_PER_GBP }))
    .sort((a, b) => b.thb - a.thb)
})

const maxCatTHB = computed(() =>
  categories.value.length ? categories.value[0].thb : 1
)

// ── Recent expenses ────────────────────────────────────────────────────────
const recent = computed(() =>
  [...store.expenses]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8)
)

// ── Stats rows ─────────────────────────────────────────────────────────────
const avgGBP = computed(() =>
  store.expenses.length ? store.totalSpentGBP / store.expenses.length : 0
)
const avgTHB = computed(() =>
  store.expenses.length ? store.totalSpentTHB / store.expenses.length : 0
)

const last30THB = computed(() => {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
  return store.expenses
    .filter((e) => new Date(e.date).getTime() >= cutoff)
    .reduce((s, e) => s + e.amountTHB, 0)
})
const last30GBP = computed(() => last30THB.value / EXCHANGE_RATE_THB_PER_GBP)

const usedPct = computed(() =>
  Math.min(100, (store.totalSpentTHB / store.initialFundTHB) * 100)
)
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Split View</h1>
        <p>GBP and THB side-by-side — every metric in both currencies at once.</p>
      </div>
      <div class="rate-badge">£1 = ฿{{ EXCHANGE_RATE_THB_PER_GBP }}</div>
    </header>

    <!-- ── Converter ─────────────────────────────────────────── -->
    <div class="converter-card">
      <p class="converter-label">Quick Converter</p>
      <div class="converter-row">
        <div class="conv-side gbp-side">
          <span class="flag">🇬🇧</span>
          <div class="conv-field">
            <label>GBP</label>
            <div class="input-wrap">
              <span class="prefix">£</span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                :value="converterGBP"
                @input="onGBPInput"
              />
            </div>
          </div>
        </div>

        <div class="conv-arrow">⇄</div>

        <div class="conv-side thb-side">
          <div class="conv-field">
            <label>THB</label>
            <div class="input-wrap">
              <span class="prefix">฿</span>
              <input
                type="number"
                min="0"
                placeholder="0.00"
                :value="converterTHB"
                @input="onTHBInput"
              />
            </div>
          </div>
          <span class="flag">🇹🇭</span>
        </div>
      </div>
      <p class="converter-hint">Fixed rate: £1 = ฿{{ EXCHANGE_RATE_THB_PER_GBP }} (budget rate)</p>
    </div>

    <!-- ── Column headers ────────────────────────────────────── -->
    <div class="split-header">
      <div class="sh-left">
        <span class="flag">🇬🇧</span>
        <span>British Pound (£)</span>
      </div>
      <div class="sh-divider"></div>
      <div class="sh-right">
        <span class="flag">🇹🇭</span>
        <span>Thai Baht (฿)</span>
      </div>
    </div>

    <!-- ── Fund overview ──────────────────────────────────────── -->
    <div class="section-title">Scholarship Fund</div>
    <div class="split-row fund-row">
      <div class="side gbp">
        <p class="metric-label">Total Fund</p>
        <p class="metric-big">{{ formatGBP(store.initialFundGBP) }}</p>
        <p class="metric-label mt">Spent</p>
        <p class="metric-med spent">{{ formatGBP(store.totalSpentGBP) }}</p>
        <p class="metric-label mt">Remaining</p>
        <p class="metric-big remaining">{{ formatGBP(store.remainingGBP) }}</p>
      </div>
      <div class="divider-col">
        <div class="progress-vert">
          <div class="pv-fill" :style="{ height: usedPct + '%' }"></div>
          <span class="pv-label">{{ usedPct.toFixed(1) }}%<br>used</span>
        </div>
      </div>
      <div class="side thb">
        <p class="metric-label">Total Fund</p>
        <p class="metric-big">{{ formatTHB(store.initialFundTHB) }}</p>
        <p class="metric-label mt">Spent</p>
        <p class="metric-med spent">{{ formatTHB(store.totalSpentTHB) }}</p>
        <p class="metric-label mt">Remaining</p>
        <p class="metric-big remaining">{{ formatTHB(store.remainingTHB) }}</p>
      </div>
    </div>

    <!-- ── Key stats ──────────────────────────────────────────── -->
    <div class="section-title">Key Statistics</div>
    <div class="stat-rows">
      <div class="stat-row">
        <div class="sr-label">This Month</div>
        <div class="sr-gbp">{{ formatGBP(monthly.thisGBP) }}</div>
        <div class="sr-mid"></div>
        <div class="sr-thb">{{ formatTHB(monthly.thisTHB) }}</div>
      </div>
      <div class="stat-row">
        <div class="sr-label">Last Month</div>
        <div class="sr-gbp muted">{{ formatGBP(monthly.lastGBP) }}</div>
        <div class="sr-mid"></div>
        <div class="sr-thb muted">{{ formatTHB(monthly.lastTHB) }}</div>
      </div>
      <div class="stat-row">
        <div class="sr-label">Last 30 Days</div>
        <div class="sr-gbp">{{ formatGBP(last30GBP) }}</div>
        <div class="sr-mid"></div>
        <div class="sr-thb">{{ formatTHB(last30THB) }}</div>
      </div>
      <div class="stat-row">
        <div class="sr-label">Avg per Expense</div>
        <div class="sr-gbp">{{ store.expenses.length ? formatGBP(avgGBP) : '—' }}</div>
        <div class="sr-mid"></div>
        <div class="sr-thb">{{ store.expenses.length ? formatTHB(avgTHB) : '—' }}</div>
      </div>
      <div class="stat-row">
        <div class="sr-label">Total Records</div>
        <div class="sr-gbp neutral">{{ store.expenses.length }}</div>
        <div class="sr-mid"></div>
        <div class="sr-thb neutral">{{ store.expenses.length }}</div>
      </div>
    </div>

    <!-- ── Categories ─────────────────────────────────────────── -->
    <div class="section-title">By Category</div>
    <div v-if="categories.length === 0" class="empty">No expenses recorded yet.</div>
    <div v-else class="cat-list">
      <div v-for="cat in categories" :key="cat.name" class="cat-row">
        <div class="cat-gbp">{{ formatGBP(cat.gbp) }}</div>
        <div class="cat-center">
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-bar-wrap">
            <div
              class="cat-bar-left"
              :style="{ width: ((cat.thb / maxCatTHB) * 100) + '%' }"
            ></div>
            <div
              class="cat-bar-right"
              :style="{ width: ((cat.thb / maxCatTHB) * 100) + '%' }"
            ></div>
          </div>
        </div>
        <div class="cat-thb">{{ formatTHB(cat.thb) }}</div>
      </div>
    </div>

    <!-- ── Recent expenses ────────────────────────────────────── -->
    <div class="section-title">Recent Expenses</div>
    <div v-if="recent.length === 0" class="empty">No expenses recorded yet.</div>
    <div v-else class="expense-table">
      <div class="et-header">
        <div class="et-date">Date</div>
        <div class="et-desc">Description</div>
        <div class="et-cat">Category</div>
        <div class="et-gbp">GBP</div>
        <div class="et-thb">THB</div>
      </div>
      <div v-for="e in recent" :key="e._id" class="et-row">
        <div class="et-date">{{ new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</div>
        <div class="et-desc">{{ e.description }}</div>
        <div class="et-cat"><span class="cat-pill">{{ e.category }}</span></div>
        <div class="et-gbp">{{ formatGBP(e.amountGBP) }}</div>
        <div class="et-thb">{{ formatTHB(e.amountTHB) }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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
.rate-badge {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  align-self: center;
}

/* ── Converter ───────────────────────────────────────────── */
.converter-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow-sm);
}
.converter-label {
  margin: 0 0 1rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
  color: var(--color-text-muted);
}
.converter-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}
.conv-side {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 180px;
}
.thb-side {
  flex-direction: row-reverse;
}
.flag {
  font-size: 1.6rem;
  line-height: 1;
}
.conv-field {
  flex: 1;
}
.conv-field label {
  display: block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  margin-bottom: 0.35rem;
}
.input-wrap {
  display: flex;
  align-items: center;
  background: var(--color-bg);
  border: 1.5px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  transition: border-color 0.15s;
}
.input-wrap:focus-within {
  border-color: #667eea;
}
.prefix {
  padding: 0 0.6rem;
  font-size: 1rem;
  color: var(--color-text-muted);
  font-weight: 600;
}
.input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  padding: 0.6rem 0.5rem 0.6rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: inherit;
  outline: none;
  min-width: 0;
}
.gbp-side .input-wrap:focus-within { border-color: #667eea; }
.thb-side .input-wrap:focus-within { border-color: #10b981; }
.conv-arrow {
  font-size: 1.4rem;
  color: var(--color-text-muted);
  flex-shrink: 0;
}
.converter-hint {
  margin: 0.75rem 0 0;
  font-size: 0.78rem;
  color: var(--color-text-faded);
  text-align: center;
}

/* ── Column headers ──────────────────────────────────────── */
.split-header {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  gap: 0;
  margin-bottom: 0.75rem;
}
.sh-left, .sh-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.5rem 1rem;
  border-radius: 8px;
}
.sh-left { background: rgba(102, 126, 234, 0.08); justify-content: flex-end; }
.sh-right { background: rgba(16, 185, 129, 0.08); }
.sh-divider { width: 40px; }

/* ── Section title ────────────────────────────────────────── */
.section-title {
  margin: 1.5rem 0 0.6rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-text-muted);
}

/* ── Fund row ─────────────────────────────────────────────── */
.split-row {
  display: grid;
  grid-template-columns: 1fr 40px 1fr;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.side {
  padding: 1.5rem;
}
.side.gbp {
  text-align: right;
  border-right: none;
}
.side.thb {
  text-align: left;
}
.metric-label {
  margin: 0;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  font-weight: 600;
}
.mt { margin-top: 0.75rem; }
.metric-big {
  margin: 0.2rem 0 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}
.metric-med {
  margin: 0.2rem 0 0;
  font-size: 1.15rem;
  font-weight: 600;
}
.spent { color: #dc2626; }
.remaining { color: #059669; }
.divider-col {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  padding: 1rem 0;
  position: relative;
}
.progress-vert {
  width: 16px;
  height: 120px;
  background: var(--color-border);
  border-radius: 999px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: flex-end;
}
.pv-fill {
  width: 100%;
  background: linear-gradient(180deg, #667eea, #764ba2);
  border-radius: 999px;
  transition: height 0.5s ease;
  position: absolute;
  bottom: 0;
}
.pv-label {
  position: absolute;
  top: -32px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.6rem;
  font-weight: 700;
  text-align: center;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ── Stat rows ────────────────────────────────────────────── */
.stat-rows {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.stat-row {
  display: grid;
  grid-template-columns: 1fr 120px 40px 120px 1fr;
  align-items: center;
  padding: 0.85rem 1.5rem;
  border-bottom: 1px solid var(--color-border-light);
}
.stat-row:last-child { border-bottom: none; }
.sr-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-align: right;
  padding-right: 1rem;
}
.sr-gbp {
  text-align: right;
  font-size: 1rem;
  font-weight: 700;
  color: #667eea;
}
.sr-thb {
  font-size: 1rem;
  font-weight: 700;
  color: #10b981;
}
.sr-gbp.muted, .sr-thb.muted { opacity: 0.5; font-weight: 500; }
.sr-gbp.neutral, .sr-thb.neutral { color: var(--color-text); }
.sr-mid {
  width: 40px;
  height: 1px;
  background: var(--color-border);
}

/* ── Categories ───────────────────────────────────────────── */
.cat-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.cat-row {
  display: grid;
  grid-template-columns: 1fr 200px 1fr;
  align-items: center;
  padding: 0.75rem 1.5rem;
  gap: 1rem;
  border-bottom: 1px solid var(--color-border-light);
}
.cat-row:last-child { border-bottom: none; }
.cat-gbp {
  text-align: right;
  font-size: 0.95rem;
  font-weight: 700;
  color: #667eea;
}
.cat-thb {
  font-size: 0.95rem;
  font-weight: 700;
  color: #10b981;
}
.cat-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
}
.cat-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}
.cat-bar-wrap {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 2px;
  height: 6px;
}
.cat-bar-left {
  height: 6px;
  background: linear-gradient(to left, #667eea, rgba(102,126,234,0.3));
  border-radius: 999px 0 0 999px;
  transition: width 0.4s ease;
  max-width: 48%;
}
.cat-bar-right {
  height: 6px;
  background: linear-gradient(to right, #10b981, rgba(16,185,129,0.3));
  border-radius: 0 999px 999px 0;
  transition: width 0.4s ease;
  max-width: 48%;
}

/* ── Expense table ────────────────────────────────────────── */
.expense-table {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  font-size: 0.875rem;
}
.et-header {
  display: grid;
  grid-template-columns: 70px 1fr 100px 90px 90px;
  padding: 0.7rem 1.25rem;
  background: var(--color-bg);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  gap: 0.75rem;
}
.et-row {
  display: grid;
  grid-template-columns: 70px 1fr 100px 90px 90px;
  padding: 0.7rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
  align-items: center;
  gap: 0.75rem;
}
.et-row:last-child { border-bottom: none; }
.et-date {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  white-space: nowrap;
}
.et-desc {
  color: var(--color-text);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.et-cat { overflow: hidden; }
.cat-pill {
  display: inline-block;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.et-gbp {
  text-align: right;
  font-weight: 700;
  color: #667eea;
}
.et-thb {
  text-align: right;
  font-weight: 700;
  color: #10b981;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-faded);
  font-size: 0.9rem;
}

@media (max-width: 640px) {
  .split-header { display: none; }
  .split-row { grid-template-columns: 1fr 8px 1fr; }
  .side { padding: 1rem; }
  .metric-big { font-size: 1.1rem; }
  .stat-row { grid-template-columns: 1fr 80px 8px 80px 1fr; padding: 0.75rem 0.75rem; }
  .sr-label { font-size: 0.75rem; padding-right: 0.5rem; }
  .sr-gbp, .sr-thb { font-size: 0.85rem; }
  .cat-row { grid-template-columns: 80px 100px 80px; padding: 0.6rem 0.75rem; }
  .cat-bar-wrap { max-width: 90px; }
  .et-header, .et-row { grid-template-columns: 60px 1fr 80px 75px; }
  .et-thb { display: none; }
  .et-header .et-thb { display: none; }
  .converter-row { flex-direction: column; }
  .conv-side, .thb-side { flex-direction: row; width: 100%; }
  .conv-arrow { transform: rotate(90deg); }
}
</style>
