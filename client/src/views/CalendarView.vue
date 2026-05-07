<script setup>
import { ref, computed, watch } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'
import { useUiStore } from '../stores/ui'
import { useToastStore } from '../stores/toast'
import { formatGBP, formatTHB } from '../composables/useCurrency'
import SpendingHeatmap from '../components/SpendingHeatmap.vue'

const expensesStore = useExpensesStore()
const incomeStore = useIncomeStore()
const ui = useUiStore()
const toast = useToastStore()

// ── View state ──────────────────────────────────────────
const view = ref('month') // 'month' | 'year'
const cursor = ref(new Date()) // any date in the displayed month
const selectedDate = ref(toISODate(new Date())) // YYYY-MM-DD

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function toISODate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const monthLabel = computed(() =>
  cursor.value.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
)

// ── Build calendar grid ─────────────────────────────────
const grid = computed(() => {
  const year = cursor.value.getFullYear()
  const month = cursor.value.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = (firstOfMonth.getDay() + 6) % 7 // shift Sun(0)→6, Mon(1)→0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayISO = toISODate(new Date())

  const cells = []
  // Pad with previous month
  const prevMonthDays = new Date(year, month, 0).getDate()
  for (let i = startWeekday - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthDays - i)
    cells.push({ date: toISODate(d), day: d.getDate(), inMonth: false, isToday: false })
  }
  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const iso = toISODate(date)
    cells.push({ date: iso, day: d, inMonth: true, isToday: iso === todayISO })
  }
  // Pad to a multiple of 7
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1]
    const d = new Date(last.date)
    d.setDate(d.getDate() + 1)
    cells.push({ date: toISODate(d), day: d.getDate(), inMonth: false, isToday: false })
  }
  return cells
})

// ── Per-day aggregates for fast lookup ───────────────────
const dayData = computed(() => {
  const map = {}
  for (const e of expensesStore.expenses) {
    if (!map[e.date]) map[e.date] = { expGBP: 0, expTHB: 0, incGBP: 0, incTHB: 0, expenses: [], incomes: [] }
    map[e.date].expGBP += e.amountGBP
    map[e.date].expTHB += e.amountTHB
    map[e.date].expenses.push(e)
  }
  for (const i of incomeStore.incomes) {
    if (!map[i.date]) map[i.date] = { expGBP: 0, expTHB: 0, incGBP: 0, incTHB: 0, expenses: [], incomes: [] }
    map[i.date].incGBP += i.amountGBP
    map[i.date].incTHB += i.amountTHB
    map[i.date].incomes.push(i)
  }
  return map
})

const monthSummary = computed(() => {
  const monthKey = `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`
  let expGBP = 0, expTHB = 0, incGBP = 0, incTHB = 0, daysWithActivity = 0
  const seen = new Set()
  for (const e of expensesStore.expenses) {
    if (e.date.startsWith(monthKey)) {
      expGBP += e.amountGBP; expTHB += e.amountTHB; seen.add(e.date)
    }
  }
  for (const i of incomeStore.incomes) {
    if (i.date.startsWith(monthKey)) {
      incGBP += i.amountGBP; incTHB += i.amountTHB; seen.add(i.date)
    }
  }
  daysWithActivity = seen.size
  return { expGBP, expTHB, incGBP, incTHB, netGBP: incGBP - expGBP, daysWithActivity }
})

// Max daily spend in this month → used to scale heat intensity
const maxDailyExpGBP = computed(() => {
  const monthKey = `${cursor.value.getFullYear()}-${String(cursor.value.getMonth() + 1).padStart(2, '0')}`
  let max = 0
  for (const [date, d] of Object.entries(dayData.value)) {
    if (date.startsWith(monthKey) && d.expGBP > max) max = d.expGBP
  }
  return max
})

function heatLevel(amount) {
  if (!amount || maxDailyExpGBP.value === 0) return 0
  const ratio = amount / maxDailyExpGBP.value
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

// ── Selected day detail ─────────────────────────────────
const selectedData = computed(() => {
  const data = dayData.value[selectedDate.value] || {
    expGBP: 0, expTHB: 0, incGBP: 0, incTHB: 0, expenses: [], incomes: []
  }
  return {
    ...data,
    netGBP: data.incGBP - data.expGBP,
    netTHB: data.incTHB - data.expTHB,
    label: new Date(selectedDate.value).toLocaleDateString('en-GB', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }
})

// ── Actions ─────────────────────────────────────────────
function selectCell(cell) {
  selectedDate.value = cell.date
  if (!cell.inMonth) {
    // Navigate to that month
    cursor.value = new Date(cell.date + 'T00:00:00')
  }
}

function prevMonth() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() - 1, 1)
}
function nextMonth() {
  cursor.value = new Date(cursor.value.getFullYear(), cursor.value.getMonth() + 1, 1)
}
function goToday() {
  cursor.value = new Date()
  selectedDate.value = toISODate(new Date())
}
function goPrevDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() - 1)
  selectedDate.value = toISODate(d)
  if (d.getMonth() !== cursor.value.getMonth() || d.getFullYear() !== cursor.value.getFullYear()) {
    cursor.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
}
function goNextDay() {
  const d = new Date(selectedDate.value)
  d.setDate(d.getDate() + 1)
  selectedDate.value = toISODate(d)
  if (d.getMonth() !== cursor.value.getMonth() || d.getFullYear() !== cursor.value.getFullYear()) {
    cursor.value = new Date(d.getFullYear(), d.getMonth(), 1)
  }
}

function quickAddForDay(type) {
  // Pre-set today's date in the modal to selectedDate via a small shim:
  // store the desired date on UI store (no API change needed); the modal
  // will pick it up via initialDate.
  ui.preferredEntryDate = selectedDate.value
  ui.preferredEntryType = type
  ui.openAddModal(type)
}

function handleEdit(item, type) {
  ui.openEditModal(type, item)
}

async function handleDelete(item, type) {
  const lbl = type === 'income' ? 'income' : 'expense'
  if (!confirm(`Delete this ${lbl} (${formatGBP(item.amountGBP)})?`)) return
  try {
    if (type === 'income') await incomeStore.deleteIncome(item._id)
    else await expensesStore.deleteExpense(item._id)
    toast.success(`${lbl[0].toUpperCase()}${lbl.slice(1)} deleted`)
  } catch (err) {
    toast.error(err.message || 'Delete failed')
  }
}

// Keyboard navigation when calendar is in focus
function onKeyNav(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
  if (e.key === 'ArrowLeft') { goPrevDay(); e.preventDefault() }
  else if (e.key === 'ArrowRight') { goNextDay(); e.preventDefault() }
  else if (e.key === 't' && !e.metaKey && !e.ctrlKey) goToday()
}

// Persist view selection in session
watch(view, (v) => sessionStorage.setItem('calendar-view', v))
const savedView = sessionStorage.getItem('calendar-view')
if (savedView === 'month' || savedView === 'year') view.value = savedView
</script>

<template>
  <div tabindex="0" @keydown="onKeyNav" class="cal-page">
    <header class="page-head">
      <div>
        <h1>Calendar</h1>
        <p>Click any day to see expenses, income, and totals for that date.</p>
      </div>
      <div class="view-toggle">
        <button :class="{ active: view === 'month' }" @click="view = 'month'">Month</button>
        <button :class="{ active: view === 'year' }" @click="view = 'year'">Year</button>
      </div>
    </header>

    <!-- ── MONTH VIEW ─────────────────────────────────── -->
    <template v-if="view === 'month'">
      <div class="cal-toolbar">
        <div class="nav">
          <button class="nav-btn" @click="prevMonth" title="Previous month (←)">‹</button>
          <button class="today" @click="goToday">Today</button>
          <button class="nav-btn" @click="nextMonth" title="Next month (→)">›</button>
        </div>
        <h2 class="month-title">{{ monthLabel }}</h2>
        <div class="legend">
          <span class="dot dot-exp"></span> Spent
          <span class="dot dot-inc"></span> Income
        </div>
      </div>

      <!-- Summary strip -->
      <div class="summary">
        <div class="sum-card">
          <span class="sum-lbl">Spent</span>
          <span class="sum-val exp">{{ formatGBP(monthSummary.expGBP) }}</span>
          <span class="sum-sub">{{ formatTHB(monthSummary.expTHB) }}</span>
        </div>
        <div class="sum-card">
          <span class="sum-lbl">Income</span>
          <span class="sum-val inc">+{{ formatGBP(monthSummary.incGBP) }}</span>
          <span class="sum-sub">{{ formatTHB(monthSummary.incTHB) }}</span>
        </div>
        <div class="sum-card">
          <span class="sum-lbl">Net</span>
          <span class="sum-val" :class="monthSummary.netGBP >= 0 ? 'inc' : 'exp'">
            {{ monthSummary.netGBP >= 0 ? '+' : '' }}{{ formatGBP(monthSummary.netGBP) }}
          </span>
          <span class="sum-sub">{{ monthSummary.daysWithActivity }} active days</span>
        </div>
      </div>

      <div class="cal-layout">
        <!-- Month grid -->
        <div class="month-grid">
          <div class="weekdays">
            <span v-for="w in WEEKDAYS" :key="w">{{ w }}</span>
          </div>
          <div class="grid">
            <button
              v-for="cell in grid"
              :key="cell.date"
              class="cell"
              :class="{
                'out': !cell.inMonth,
                'today': cell.isToday,
                'selected': selectedDate === cell.date,
                [`heat-${heatLevel(dayData[cell.date]?.expGBP)}`]: cell.inMonth,
                'has-income': dayData[cell.date]?.incGBP > 0
              }"
              @click="selectCell(cell)"
            >
              <span class="num">{{ cell.day }}</span>
              <template v-if="dayData[cell.date]">
                <span v-if="dayData[cell.date].expGBP > 0" class="amt exp">
                  −£{{ Math.round(dayData[cell.date].expGBP) }}
                </span>
                <span v-if="dayData[cell.date].incGBP > 0" class="amt inc">
                  +£{{ Math.round(dayData[cell.date].incGBP) }}
                </span>
                <div class="dots">
                  <span
                    v-for="(_, i) in Math.min(dayData[cell.date].expenses?.length || 0, 4)"
                    :key="`e${i}`"
                    class="cdot exp"
                  ></span>
                  <span
                    v-for="(_, i) in Math.min(dayData[cell.date].incomes?.length || 0, 2)"
                    :key="`i${i}`"
                    class="cdot inc"
                  ></span>
                </div>
              </template>
            </button>
          </div>
        </div>

        <!-- Detail panel -->
        <aside class="detail">
          <div class="detail-head">
            <button class="day-nav" @click="goPrevDay" title="Previous day">‹</button>
            <div class="day-title">
              <h3>{{ selectedData.label }}</h3>
              <p v-if="selectedData.expenses.length || selectedData.incomes.length">
                {{ selectedData.expenses.length }} expense{{ selectedData.expenses.length === 1 ? '' : 's' }}
                · {{ selectedData.incomes.length }} income
              </p>
              <p v-else class="dim">No activity</p>
            </div>
            <button class="day-nav" @click="goNextDay" title="Next day">›</button>
          </div>

          <div class="day-totals">
            <div class="dt">
              <span class="lbl">Spent</span>
              <span class="val exp">{{ formatGBP(selectedData.expGBP) }}</span>
            </div>
            <div class="dt">
              <span class="lbl">Income</span>
              <span class="val inc">+{{ formatGBP(selectedData.incGBP) }}</span>
            </div>
            <div class="dt">
              <span class="lbl">Net</span>
              <span class="val" :class="selectedData.netGBP >= 0 ? 'inc' : 'exp'">
                {{ selectedData.netGBP >= 0 ? '+' : '' }}{{ formatGBP(selectedData.netGBP) }}
              </span>
            </div>
          </div>

          <div class="quick-actions">
            <button class="qa exp" @click="quickAddForDay('expense')">+ Add expense</button>
            <button class="qa inc" @click="quickAddForDay('income')">+ Add income</button>
          </div>

          <!-- Expenses list -->
          <div v-if="selectedData.expenses.length" class="section">
            <div class="sec-head">
              <span class="sec-title">Expenses</span>
              <span class="sec-amt exp">{{ formatGBP(selectedData.expGBP) }}</span>
            </div>
            <div v-for="e in selectedData.expenses" :key="e._id" class="item">
              <div class="item-main">
                <span class="cat-pill">{{ e.category }}</span>
                <span class="desc">{{ e.description || '—' }}</span>
              </div>
              <div class="item-right">
                <span class="item-amt exp">{{ formatGBP(e.amountGBP) }}</span>
                <button class="ic-btn" @click="handleEdit(e, 'expense')" title="Edit">✎</button>
                <button class="ic-btn del" @click="handleDelete(e, 'expense')" title="Delete">×</button>
              </div>
            </div>
          </div>

          <!-- Income list -->
          <div v-if="selectedData.incomes.length" class="section">
            <div class="sec-head">
              <span class="sec-title">Income</span>
              <span class="sec-amt inc">+{{ formatGBP(selectedData.incGBP) }}</span>
            </div>
            <div v-for="i in selectedData.incomes" :key="i._id" class="item">
              <div class="item-main">
                <span class="cat-pill inc">{{ i.category }}</span>
                <span class="desc">{{ i.description || '—' }}</span>
              </div>
              <div class="item-right">
                <span class="item-amt inc">+{{ formatGBP(i.amountGBP) }}</span>
                <button class="ic-btn" @click="handleEdit(i, 'income')" title="Edit">✎</button>
                <button class="ic-btn del" @click="handleDelete(i, 'income')" title="Delete">×</button>
              </div>
            </div>
          </div>

          <div v-if="!selectedData.expenses.length && !selectedData.incomes.length" class="empty">
            Nothing recorded for this day.<br>
            <span class="dim">Use the buttons above to add an entry.</span>
          </div>

          <p class="hint">Tip: <span class="kbd">←</span> <span class="kbd">→</span> to move between days · <span class="kbd">T</span> to jump to today</p>
        </aside>
      </div>
    </template>

    <!-- ── YEAR VIEW ──────────────────────────────────── -->
    <template v-else>
      <SpendingHeatmap :weeks="53" />
    </template>
  </div>
</template>

<style scoped>
.cal-page { outline: none; }
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}
.page-head h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--color-text); }
.page-head p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; max-width: 60ch; }

.view-toggle {
  display: flex;
  background: var(--color-surface-3);
  border-radius: 8px;
  padding: 0.2rem;
}
.view-toggle button {
  background: transparent;
  border: none;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  color: var(--color-text-muted);
}
.view-toggle button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}

.cal-toolbar {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}
.nav { display: flex; gap: 0.4rem; }
.nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 1.2rem;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
  line-height: 1;
}
.nav-btn:hover { background: var(--color-surface-2); }
.today {
  padding: 0 0.85rem;
  height: 36px;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  color: var(--color-text);
}
.today:hover { background: var(--color-surface-2); }
.month-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text);
  text-align: center;
}
.legend {
  display: flex;
  gap: 0.7rem;
  font-size: 0.78rem;
  color: var(--color-text-muted);
  align-items: center;
  white-space: nowrap;
}
.legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 2px;
  vertical-align: middle;
}
.dot-exp { background: #dc2626; }
.dot-inc { background: #00bb77; }

/* Summary cards */
.summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.sum-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.75rem 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  box-shadow: var(--shadow-sm);
}
.sum-lbl {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}
.sum-val { font-size: 1.15rem; font-weight: 700; }
.sum-val.exp { color: #dc2626; }
.sum-val.inc { color: #00bb77; }
.sum-sub { font-size: 0.72rem; color: var(--color-text-faded); }

/* Layout: grid + detail */
.cal-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 1rem;
  align-items: flex-start;
}

.month-grid {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: var(--shadow-sm);
}
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  text-align: center;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-border-light);
  margin-bottom: 0.4rem;
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.cell {
  background: var(--color-surface-2);
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0.4rem 0.45rem;
  min-height: 78px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  transition: background 0.12s, border-color 0.12s, transform 0.06s;
  position: relative;
}
.cell:hover { background: var(--color-surface-3); }
.cell:active { transform: scale(0.98); }
.cell.out { opacity: 0.4; background: transparent; }
.cell.today {
  border-color: var(--color-accent);
  font-weight: 700;
}
.cell.today .num {
  color: var(--color-accent);
}
.cell.selected {
  background: var(--color-info-bg) !important;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(0, 187, 119, 0.15);
}
.num {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
}
.amt {
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.amt.exp { color: #dc2626; }
.amt.inc { color: #00bb77; }
.dots {
  display: flex;
  gap: 2px;
  margin-top: auto;
  flex-wrap: wrap;
}
.cdot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
}
.cdot.exp { background: #dc2626; }
.cdot.inc { background: #00bb77; }

/* Heat overlay (subtle red wash) — applied to cell background */
.cell.heat-1 { background: rgba(220, 38, 38, 0.06); }
.cell.heat-2 { background: rgba(220, 38, 38, 0.13); }
.cell.heat-3 { background: rgba(220, 38, 38, 0.22); }
.cell.heat-4 { background: rgba(220, 38, 38, 0.32); }

/* Detail panel */
.detail {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1rem 1.1rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
}
.detail-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--color-border-light);
}
.day-nav {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  font-size: 1rem;
  font-family: inherit;
  line-height: 1;
}
.day-nav:hover { background: var(--color-surface-2); color: var(--color-text); }
.day-title { text-align: center; }
.day-title h3 {
  margin: 0;
  font-size: 0.95rem;
  color: var(--color-text);
  font-weight: 700;
}
.day-title p {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}
.day-title p.dim { color: var(--color-text-faded); }

.day-totals {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 0.5rem;
}
.dt {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--color-surface-2);
  padding: 0.55rem 0.4rem;
  border-radius: 8px;
  gap: 0.1rem;
}
.dt .lbl {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}
.dt .val { font-size: 0.85rem; font-weight: 700; }
.dt .val.exp { color: #dc2626; }
.dt .val.inc { color: #00bb77; }

.quick-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
}
.qa {
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text);
  transition: filter 0.12s;
}
.qa:hover { filter: brightness(1.05); }
.qa.exp { color: white; background: linear-gradient(135deg, #ef4444, #dc2626); border-color: transparent; }
.qa.inc { color: white; background: linear-gradient(135deg, #00bb77, #008855); border-color: transparent; }

.section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.sec-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.3rem;
}
.sec-amt { font-size: 0.85rem; font-weight: 700; }
.sec-amt.exp { color: #dc2626; }
.sec-amt.inc { color: #00bb77; }
.item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0;
  border-bottom: 1px solid var(--color-border-light);
}
.item:last-child { border-bottom: none; }
.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.cat-pill {
  display: inline-block;
  background: rgba(220, 38, 38, 0.1);
  color: #dc2626;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  width: max-content;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cat-pill.inc {
  background: rgba(0, 187, 119, 0.12);
  color: #00bb77;
}
.desc {
  font-size: 0.78rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.item-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.item-amt { font-size: 0.85rem; font-weight: 700; }
.item-amt.exp { color: #dc2626; }
.item-amt.inc { color: #00bb77; }
.ic-btn {
  width: 24px;
  height: 24px;
  border-radius: 5px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--color-text-faded);
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  font-weight: 700;
  line-height: 1;
}
.ic-btn:hover {
  background: var(--color-info-bg);
  color: var(--color-info-text);
}
.ic-btn.del:hover {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}
.empty {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: var(--color-text-faded);
  font-size: 0.85rem;
  line-height: 1.5;
}
.dim { color: var(--color-text-faded); }
.hint {
  margin: 0;
  font-size: 0.7rem;
  color: var(--color-text-faded);
  text-align: center;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border-light);
}
.kbd {
  display: inline-block;
  padding: 0.05rem 0.35rem;
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: 3px;
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 0.7rem;
  color: var(--color-text);
}

/* Responsive */
@media (max-width: 1024px) {
  .cal-layout { grid-template-columns: 1fr; }
  .detail { position: static; max-height: none; }
}
@media (max-width: 600px) {
  .cell { min-height: 60px; padding: 0.25rem 0.3rem; }
  .num { font-size: 0.78rem; }
  .amt { font-size: 0.62rem; }
  .summary { grid-template-columns: 1fr; }
  .cal-toolbar { grid-template-columns: 1fr; gap: 0.5rem; text-align: center; }
  .legend { justify-content: center; }
}
</style>
