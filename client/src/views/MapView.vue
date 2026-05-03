<script setup>
import { ref, computed, onMounted, watch, onBeforeUnmount, nextTick } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { L, categoryIcon } from '../composables/useLeaflet'
import { formatGBP, formatTHB } from '../composables/useCurrency'

const store = useExpensesStore()

const mapEl = ref(null)
const selected = ref(null)

let map = null
let markers = []

const located = computed(() =>
  store.expenses.filter((e) => e.location?.lat != null && e.location?.lng != null)
)
const unlocatedCount = computed(() => store.expenses.length - located.value.length)
const totalGBP = computed(() => located.value.reduce((s, e) => s + e.amountGBP, 0))
const totalTHB = computed(() => located.value.reduce((s, e) => s + e.amountTHB, 0))

const CATEGORY_COLORS = {
  'Food & Groceries': '#00bb77',
  'Rent & Bills': '#0ea5e9',
  'Tuition': '#6366f1',
  'Transport': '#f59e0b',
  'Books & Supplies': '#a78bfa',
  'Health': '#ec4899',
  'Entertainment': '#14b8a6',
  'Travel': '#84cc16',
  'Personal': '#f43f5e',
  'Other': '#54585A'
}
function categoryColor(cat) { return CATEGORY_COLORS[cat] || '#00bb77' }

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c])
}

function buildPopup(e) {
  const date = new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const desc = e.description ? `<div style="margin-bottom:4px">${escapeHtml(e.description)}</div>` : ''
  const addr = e.location?.address ? `<div style="font-size:11px;color:#888;margin-top:4px">${escapeHtml(e.location.address)}</div>` : ''
  return `
    <div style="font-family:inherit;min-width:180px">
      <div style="font-weight:700;color:${categoryColor(e.category)}">${escapeHtml(e.category)}</div>
      ${desc}
      <div style="font-weight:700;font-size:14px;margin:2px 0">
        ${formatGBP(e.amountGBP)} <span style="color:#888;font-weight:400">(${formatTHB(e.amountTHB)})</span>
      </div>
      <div style="font-size:11px;color:#888">${date}</div>
      ${addr}
    </div>
  `
}

async function init() {
  // Wait for DOM, animation frame, and any route transition to settle
  await nextTick()
  await new Promise((r) => requestAnimationFrame(r))
  await new Promise((r) => setTimeout(r, 100))
  if (!mapEl.value || map) return

  map = L.map(mapEl.value).setView([51.4545, -2.5879], 5)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map)
  drawMarkers()

  // Force re-measure in case the route transition wasn't done when init ran
  map.invalidateSize()
  setTimeout(() => map?.invalidateSize(), 250)
  setTimeout(() => map?.invalidateSize(), 700)
  window.addEventListener('resize', onWindowResize)
}

function onWindowResize() {
  if (map) map.invalidateSize()
}

function clearMarkers() {
  markers.forEach((m) => m.remove())
  markers = []
}

function drawMarkers() {
  if (!map) return
  clearMarkers()
  if (located.value.length === 0) return

  const bounds = []
  for (const e of located.value) {
    const m = L.marker([e.location.lat, e.location.lng], {
      icon: categoryIcon(categoryColor(e.category)),
      title: e.description || e.category
    }).addTo(map)
    m.bindPopup(buildPopup(e))
    m.on('click', () => { selected.value = e })
    m._expenseId = e._id
    markers.push(m)
    bounds.push([e.location.lat, e.location.lng])
  }
  if (bounds.length === 1) {
    map.setView(bounds[0], 15)
  } else {
    map.fitBounds(bounds, { padding: [40, 40] })
  }
}

function focusOn(e) {
  if (!map || !e.location?.lat) return
  selected.value = e
  map.setView([e.location.lat, e.location.lng], 16, { animate: true })
  const m = markers.find((mk) => mk._expenseId === e._id)
  if (m) m.openPopup()
}

onMounted(init)
onBeforeUnmount(() => {
  window.removeEventListener('resize', onWindowResize)
  clearMarkers()
  if (map) { map.remove(); map = null }
})

watch(() => store.expenses, () => drawMarkers(), { deep: false })
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Map</h1>
        <p>{{ located.length }} expense{{ located.length === 1 ? '' : 's' }} with locations
          <template v-if="unlocatedCount">· {{ unlocatedCount }} without</template>
        </p>
      </div>
      <div class="totals">
        <span class="t-gbp">{{ formatGBP(totalGBP) }}</span>
        <span class="t-thb">{{ formatTHB(totalTHB) }}</span>
      </div>
    </header>

    <div class="layout">
      <div class="map-card">
        <div ref="mapEl" class="map"></div>
      </div>

      <aside class="sidebar-list">
        <div class="list-head">Located expenses</div>
        <div v-if="located.length === 0" class="empty">
          No expenses with locations yet. Add a location when creating an expense.
        </div>
        <button
          v-for="e in located"
          :key="e._id"
          class="row"
          :class="{ active: selected?._id === e._id }"
          @click="focusOn(e)"
        >
          <span class="dot" :style="{ background: categoryColor(e.category) }"></span>
          <span class="row-main">
            <span class="row-cat">{{ e.category }}</span>
            <span class="row-desc">{{ e.description || e.location.name || e.location.address }}</span>
            <span class="row-date">{{ new Date(e.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) }}</span>
          </span>
          <span class="row-amt">{{ formatGBP(e.amountGBP) }}</span>
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 1.25rem;
  gap: 1rem;
  flex-wrap: wrap;
}
.page-head h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--color-text); }
.page-head p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; }
.totals {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
}
.t-gbp { font-size: 1.05rem; font-weight: 700; color: var(--color-accent); }
.t-thb { font-size: 0.78rem; color: var(--color-text-muted); }

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 1rem;
}
.map-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: var(--shadow-sm);
  position: relative;
  min-height: 540px;
}
.map {
  width: 100%;
  height: 540px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--color-bg);
}

.sidebar-list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  max-height: 580px;
  overflow: hidden;
}
.list-head {
  padding: 0.7rem 1rem;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  font-weight: 700;
  color: var(--color-text-muted);
  border-bottom: 1px solid var(--color-border-light);
  background: var(--color-surface-2);
}
.empty {
  padding: 1.5rem 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--color-text-faded);
}
.row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.9rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-border-light);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  width: 100%;
  color: var(--color-text);
  transition: background 0.12s;
}
.row:hover { background: var(--color-surface-2); }
.row.active { background: var(--color-info-bg); }
.row:last-child { border-bottom: none; }
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid white;
  box-shadow: 0 0 0 1px var(--color-border);
}
.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
}
.row-cat {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
}
.row-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-date {
  font-size: 0.7rem;
  color: var(--color-text-faded);
}
.row-amt {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-accent);
  white-space: nowrap;
}

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; }
  .map, .map-card { min-height: 380px; }
  .map { height: 380px; }
  .sidebar-list { max-height: 360px; }
}
</style>
