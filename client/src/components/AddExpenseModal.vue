<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from './Modal.vue'
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'
import { useToastStore } from '../stores/toast'
import {
  toGBP, gbpToThb, formatTHB, formatGBP,
  SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS
} from '../composables/useCurrency'

const ui = useUiStore()
const expenseStore = useExpensesStore()
const toast = useToastStore()

const CATEGORIES = [
  'Food & Groceries',
  'Rent & Bills',
  'Tuition',
  'Transport',
  'Books & Supplies',
  'Health',
  'Entertainment',
  'Travel',
  'Personal',
  'Other'
]

const today = () => new Date().toISOString().slice(0, 10)
const initialForm = () => ({
  date: today(),
  category: CATEGORIES[0],
  description: '',
  amount: '',
  currency: 'GBP'
})

const form = reactive(initialForm())
const submitting = ref(false)
const error = ref('')

const currencySymbol = computed(() => CURRENCY_SYMBOLS[form.currency] || '£')

const previewGBP = computed(() => {
  const n = Number(form.amount)
  if (!n || isNaN(n) || n <= 0) return null
  return toGBP(n, form.currency)
})

const previewText = computed(() => {
  if (!previewGBP.value) return null
  if (form.currency === 'GBP') {
    return `≈ ${formatTHB(gbpToThb(previewGBP.value))}`
  }
  return `≈ ${formatGBP(previewGBP.value)} · ${formatTHB(gbpToThb(previewGBP.value))}`
})

watch(
  () => ui.addModalOpen,
  (open) => {
    if (open) {
      Object.assign(form, initialForm())
      error.value = ''
    }
  }
)

async function handleSubmit() {
  const amount = Number(form.amount)
  if (!amount || amount <= 0) {
    error.value = 'Please enter an amount greater than zero.'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    await expenseStore.addExpense({
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      currency: form.currency,
      amountOriginal: amount,
      amountGBP: toGBP(amount, form.currency)
    })
    const gbpAmt = toGBP(amount, form.currency)
    toast.success(`Added ${formatGBP(gbpAmt)} to ${form.category}`)
    ui.closeAddModal()
  } catch (err) {
    error.value = err.message || 'Could not save the expense.'
    toast.error(error.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal
    :open="ui.addModalOpen"
    title="Add New Expense"
    @close="ui.closeAddModal"
  >
    <form class="form" @submit.prevent="handleSubmit">
      <label>
        Date
        <input v-model="form.date" type="date" required />
      </label>

      <label>
        Category
        <select v-model="form.category" required>
          <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>

      <label>
        Description (optional)
        <input
          v-model="form.description"
          type="text"
          placeholder="e.g. Tesco weekly shop"
        />
      </label>

      <div class="amount-row">
        <label class="amount-sublabel">
          Currency
          <select v-model="form.currency" class="currency-select">
            <option v-for="c in SUPPORTED_CURRENCIES" :key="c" :value="c">
              {{ CURRENCY_SYMBOLS[c] }} {{ c }}
            </option>
          </select>
        </label>

        <label class="amount-sublabel">
          Amount
          <div class="input-with-prefix">
            <span class="prefix">{{ currencySymbol }}</span>
            <input
              v-model="form.amount"
              type="number"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              autofocus
            />
          </div>
        </label>
      </div>

      <p v-if="previewText" class="preview">{{ previewText }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="actions">
        <button
          type="button"
          class="cancel"
          :disabled="submitting"
          @click="ui.closeAddModal"
        >
          Cancel
        </button>
        <button type="submit" class="save" :disabled="submitting">
          {{ submitting ? 'Saving…' : 'Save Expense' }}
        </button>
      </div>
    </form>
  </Modal>
</template>

<style scoped>
.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
input,
select {
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
  background: var(--color-surface);
  color: var(--color-text);
  box-sizing: border-box;
}
input:focus,
select:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 187, 119, 0.15);
}
.amount-row {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 0.75rem;
  align-items: end;
}
.amount-sublabel {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.input-with-prefix {
  position: relative;
}
.prefix {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  font-weight: 500;
  pointer-events: none;
}
.input-with-prefix input {
  padding-left: 1.85rem;
}
.preview {
  margin: -0.25rem 0 0;
  font-size: 0.875rem;
  color: var(--color-accent);
  font-weight: 500;
}
.error {
  margin: 0;
  background: var(--color-error-bg);
  color: var(--color-error-text);
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.actions button {
  padding: 0.65rem 1.1rem;
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: none;
}
.cancel {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border) !important;
}
.cancel:hover:not(:disabled) {
  background: var(--color-surface-2);
}
.save {
  background: #00bb77;
  color: white;
}
.save:hover:not(:disabled) {
  background: #008855;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
