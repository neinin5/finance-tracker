<script setup>
import { ref, watch, onMounted } from 'vue'
import { useBudgetStore } from '../stores/budget'
import { useExpensesStore } from '../stores/expenses'
import { formatGBP } from '../composables/useCurrency'

const budget = useBudgetStore()
const expenses = useExpensesStore()

const editing = ref(false)
const inputValue = ref('')
const saveError = ref('')

onMounted(async () => {
  await budget.fetchBudget()
  budget.syncFromExpenses()
})

// Keep spent in sync when expenses change
watch(
  () => expenses.expenses,
  () => budget.syncFromExpenses(),
  { deep: false }
)

function startEdit() {
  inputValue.value = budget.monthlyLimitGBP !== null
    ? String(budget.monthlyLimitGBP)
    : ''
  saveError.value = ''
  editing.value = true
}

async function saveLimit() {
  const val = Number(inputValue.value)
  if (!val || val <= 0) {
    saveError.value = 'Enter a positive number.'
    return
  }
  try {
    await budget.saveBudget(val)
    editing.value = false
  } catch (err) {
    saveError.value = err.message
  }
}

function cancelEdit() {
  editing.value = false
  saveError.value = ''
}

function monthLabel(monthStr) {
  if (!monthStr) return ''
  const [y, m] = monthStr.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('en-GB', {
    month: 'long',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="budget-card" :class="{ 'over-budget': budget.overBudget }">
    <div class="header">
      <div>
        <h2>Monthly Budget</h2>
        <p class="sub">{{ monthLabel(budget.currentMonth) }}</p>
      </div>
      <button v-if="!editing" class="edit-btn" @click="startEdit">
        {{ budget.monthlyLimitGBP !== null ? 'Edit limit' : 'Set limit' }}
      </button>
    </div>

    <!-- Edit mode -->
    <div v-if="editing" class="edit-form">
      <div class="edit-row">
        <span class="edit-prefix">£</span>
        <input
          v-model="inputValue"
          type="number"
          step="1"
          min="1"
          placeholder="e.g. 800"
          autofocus
          @keyup.enter="saveLimit"
          @keyup.escape="cancelEdit"
        />
        <button class="save-btn" :disabled="budget.saving" @click="saveLimit">
          {{ budget.saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="cancel-btn" @click="cancelEdit">Cancel</button>
      </div>
      <p v-if="saveError" class="save-error">{{ saveError }}</p>
    </div>

    <!-- No limit set yet -->
    <div v-else-if="budget.monthlyLimitGBP === null" class="no-limit">
      <p>No monthly limit set. Click <strong>Set limit</strong> to get started.</p>
    </div>

    <!-- Budget display -->
    <template v-else>
      <div class="amounts">
        <div v-if="budget.overBudget" class="over">
          <span class="over-icon">⚠️</span>
          Over budget by
          <strong>{{ formatGBP(Math.abs(budget.remainingGBP)) }}</strong>
        </div>
        <div v-else class="remaining">
          <span class="big">{{ formatGBP(budget.remainingGBP) }}</span>
          <span class="label-small">remaining this month</span>
        </div>
      </div>

      <div class="progress-wrap">
        <div
          class="progress-bar"
          :style="{ width: budget.usedPercent + '%' }"
          :title="`${budget.usedPercent.toFixed(1)}% used`"
        ></div>
      </div>

      <div class="meta">
        <span>{{ formatGBP(budget.spentThisMonthGBP) }} spent</span>
        <span>{{ budget.usedPercent.toFixed(1) }}% of {{ formatGBP(budget.monthlyLimitGBP) }}</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.budget-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  padding: 1.75rem;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s;
}
.budget-card.over-budget {
  border-color: var(--color-error-text);
  background: var(--color-error-bg);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.25rem;
}
.header h2 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}
.sub {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.edit-btn {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
  flex-shrink: 0;
}
.edit-btn:hover {
  color: var(--color-text);
  background: var(--color-surface);
}
.edit-form {
  margin-bottom: 0.5rem;
}
.edit-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.edit-prefix {
  font-size: 1.1rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.edit-row input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-surface);
  color: var(--color-text);
}
.edit-row input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
.save-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
}
.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cancel-btn {
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  padding: 0.55rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
}
.save-error {
  margin: 0.5rem 0 0;
  font-size: 0.8rem;
  color: var(--color-error-text);
}
.no-limit {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}
.no-limit p { margin: 0; }
.amounts {
  margin-bottom: 1rem;
}
.remaining {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.big {
  font-size: 2.25rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.label-small {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}
.over {
  font-size: 1rem;
  color: var(--color-error-text);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.over-icon { font-size: 1.2rem; }
.progress-wrap {
  height: 10px;
  background: var(--color-surface-2);
  border-radius: 999px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}
.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 999px;
  transition: width 0.4s ease;
}
.over-budget .progress-bar {
  background: var(--color-error-text);
  width: 100% !important;
}
.meta {
  margin-top: 0.65rem;
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  gap: 1rem;
  flex-wrap: wrap;
}
</style>
