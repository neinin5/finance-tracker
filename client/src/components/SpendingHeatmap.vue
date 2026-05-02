<script setup>
import { computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { formatGBP, formatTHB, thbToGbp } from '../composables/useCurrency'

const props = defineProps({
  weeks: { type: Number, default: 53 }
})

const store = useExpensesStore()

const grid = computed(() => {
  const today = new Date()
  // Find Sunday at the start of the window
  const start = new Date(today)
  start.setDate(start.getDate() - (props.weeks - 1) * 7)
  start.setDate(start.getDate() - start.getDay())

  const days = []
  for (let i = 0; i < props.weeks * 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    if (d > today) {
      days.push({ key: `f${i}`, future: true, value: 0 })
      continue
    }
    const iso = d.toISOString().slice(0, 10)
    days.push({
      key: iso,
      iso,
      dateLabel: d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }),
      value: store.spentByDay[iso] || 0,
      future: false
    })
  }
  return days
})

const maxValue = computed(() => {
  let max = 0
  for (const d of grid.value) if (d.value > max) max = d.value
  return max
})

function colorFor(value) {
  if (!value || maxValue.value === 0) return 'var(--heatmap-empty)'
  const ratio = value / maxValue.value
  if (ratio < 0.25) return 'var(--heatmap-1)'
  if (ratio < 0.5) return 'var(--heatmap-2)'
  if (ratio < 0.75) return 'var(--heatmap-3)'
  return 'var(--heatmap-4)'
}

function tooltipFor(day) {
  if (day.future) return ''
  if (!day.value) return `${day.dateLabel}: no spending`
  return `${day.dateLabel}: ${formatGBP(thbToGbp(day.value))} (${formatTHB(day.value)})`
}

const monthLabels = computed(() => {
  // Build labels: one entry per month start visible in the grid
  const labels = []
  let lastMonth = -1
  grid.value.forEach((day, i) => {
    if (day.future) return
    const month = new Date(day.iso).getMonth()
    const week = Math.floor(i / 7)
    if (month !== lastMonth && i % 7 === 0) {
      labels.push({
        text: new Date(day.iso).toLocaleDateString('en-GB', {
          month: 'short'
        }),
        weekIndex: week
      })
      lastMonth = month
    }
  })
  return labels
})

const totalThisYear = computed(() => {
  return grid.value.reduce((s, d) => s + (d.future ? 0 : d.value), 0)
})
const activeDays = computed(
  () => grid.value.filter((d) => !d.future && d.value > 0).length
)
</script>

<template>
  <div class="card">
    <div class="head">
      <div>
        <h3>Spending Calendar</h3>
        <p class="sub">
          {{ activeDays }} active days · total
          {{ formatGBP(thbToGbp(totalThisYear)) }} ({{ formatTHB(totalThisYear) }})
        </p>
      </div>
    </div>

    <div class="scroll-wrap">
      <div class="heatmap" :style="{ '--cols': weeks }">
        <div class="months">
          <span
            v-for="m in monthLabels"
            :key="m.weekIndex + m.text"
            :style="{ left: m.weekIndex * 14 + 'px' }"
          >
            {{ m.text }}
          </span>
        </div>
        <div class="day-labels">
          <span>Sun</span>
          <span></span>
          <span>Tue</span>
          <span></span>
          <span>Thu</span>
          <span></span>
          <span>Sat</span>
        </div>
        <div class="grid">
          <div
            v-for="d in grid"
            :key="d.key"
            class="cell"
            :class="{ future: d.future }"
            :style="{ background: d.future ? 'transparent' : colorFor(d.value) }"
            :title="tooltipFor(d)"
          ></div>
        </div>
      </div>
    </div>

    <div class="legend">
      <span>Less</span>
      <div class="cell" :style="{ background: 'var(--heatmap-empty)' }"></div>
      <div class="cell" :style="{ background: 'var(--heatmap-1)' }"></div>
      <div class="cell" :style="{ background: 'var(--heatmap-2)' }"></div>
      <div class="cell" :style="{ background: 'var(--heatmap-3)' }"></div>
      <div class="cell" :style="{ background: 'var(--heatmap-4)' }"></div>
      <span>More</span>
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}
.head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.25rem;
}
.head h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: var(--color-text);
}
.sub {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.85rem;
}
.scroll-wrap {
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.5rem;
}
.heatmap {
  position: relative;
  display: inline-grid;
  grid-template-columns: 28px auto;
  grid-template-rows: 16px auto;
  gap: 4px 6px;
}
.months {
  grid-column: 2;
  grid-row: 1;
  position: relative;
  height: 16px;
  font-size: 11px;
  color: var(--color-text-muted);
}
.months span {
  position: absolute;
  top: 0;
}
.day-labels {
  grid-column: 1;
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, 12px);
  gap: 2px;
  align-items: center;
  font-size: 10px;
  color: var(--color-text-faded);
}
.day-labels span {
  height: 12px;
  line-height: 12px;
}
.grid {
  grid-column: 2;
  grid-row: 2;
  display: grid;
  grid-template-rows: repeat(7, 12px);
  grid-auto-flow: column;
  grid-auto-columns: 12px;
  gap: 2px;
}
.cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  transition: transform 0.1s;
}
.cell:hover:not(.future) {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
  transform: scale(1.15);
}
.cell.future {
  background: transparent !important;
}
.legend {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  justify-content: flex-end;
}
.legend .cell {
  width: 12px;
  height: 12px;
}
</style>
