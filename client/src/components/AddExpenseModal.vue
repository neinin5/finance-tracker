<script setup>
import { ref, reactive, computed, watch, defineAsyncComponent } from 'vue'
import Modal from './Modal.vue'
const LocationPicker = defineAsyncComponent(() => import('./LocationPicker.vue'))
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore, INCOME_CATEGORIES } from '../stores/income'
import { useToastStore } from '../stores/toast'
import {
  toGBP, gbpToThb, formatTHB, formatGBP,
  SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS
} from '../composables/useCurrency'

const ui = useUiStore()
const expenseStore = useExpensesStore()
const incomeStore = useIncomeStore()
const toast = useToastStore()

const EXPENSE_CATEGORIES = [
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
const entryType = ref('expense') // 'expense' | 'income'
const currentCategories = computed(() =>
  entryType.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
)

const today = () => new Date().toISOString().slice(0, 10)
const initialForm = () => ({
  date: today(),
  category: EXPENSE_CATEGORIES[0],
  description: '',
  amount: '',
  currency: 'GBP',
  location: null
})

// Reset category when type changes so selection stays valid
watch(entryType, (t) => {
  form.category = t === 'income' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]
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

const isEditing = computed(() => ui.editingItem != null)
const editingId = computed(() => ui.editingItem?.data?._id || null)

watch(
  () => ui.addModalOpen,
  (open) => {
    if (open) {
      const editing = ui.editingItem
      if (editing) {
        // Edit mode — pre-populate from existing record
        entryType.value = editing.type
        const d = editing.data
        Object.assign(form, {
          date: d.date,
          category: d.category,
          description: d.description || '',
          amount: String(d.amountOriginal ?? d.amountGBP ?? ''),
          currency: d.currency || 'GBP',
          location: d.location?.lat != null ? { ...d.location } : null
        })
      } else {
        entryType.value = ui.preferredEntryType || 'expense'
        Object.assign(form, initialForm())
        form.category = entryType.value === 'income'
          ? INCOME_CATEGORIES[0]
          : EXPENSE_CATEGORIES[0]
        // Honor preferred entry date (e.g. clicked from calendar)
        if (ui.preferredEntryDate) form.date = ui.preferredEntryDate
      }
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
    const gbpAmt = toGBP(amount, form.currency)
    const incomePayload = {
      date: form.date,
      category: form.category,
      description: form.description.trim(),
      currency: form.currency,
      amountOriginal: amount,
      amountGBP: gbpAmt
    }
    const expensePayload = {
      ...incomePayload,
      location: form.location || null
    }

    if (isEditing.value) {
      if (entryType.value === 'income') {
        await incomeStore.updateIncome(editingId.value, incomePayload)
        toast.success(`Income updated · ${formatGBP(gbpAmt)}`)
      } else {
        await expenseStore.updateExpense(editingId.value, expensePayload)
        toast.success(`Expense updated · ${formatGBP(gbpAmt)}`)
      }
    } else {
      if (entryType.value === 'income') {
        await incomeStore.addIncome(incomePayload)
        toast.success(`+${formatGBP(gbpAmt)} income · ${form.category}`)
      } else {
        await expenseStore.addExpense(expensePayload)
        toast.success(`Added ${formatGBP(gbpAmt)} to ${form.category}`)
      }
    }
    ui.closeAddModal()
  } catch (err) {
    error.value = err.message || 'Could not save.'
    toast.error(error.value)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <Modal
    :open="ui.addModalOpen"
    :title="isEditing
      ? (entryType === 'income' ? 'Edit Income' : 'Edit Expense')
      : (entryType === 'income' ? 'Add Income' : 'Add Expense')"
    @close="ui.closeAddModal"
  >
    <form class="form" @submit.prevent="handleSubmit">
      <div v-if="!isEditing" class="type-toggle" :class="entryType">
        <button type="button" :class="{ active: entryType === 'expense' }" @click="entryType = 'expense'">
          <span class="icon">−</span> Expense
        </button>
        <button type="button" :class="{ active: entryType === 'income' }" @click="entryType = 'income'">
          <span class="icon">+</span> Income
        </button>
      </div>
      <div v-else class="edit-banner" :class="entryType">
        <span class="icon">{{ entryType === 'income' ? '+' : '−' }}</span>
        Editing {{ entryType === 'income' ? 'income' : 'expense' }} record
      </div>

      <label>
        Date
        <input v-model="form.date" type="date" required />
      </label>

      <label>
        Category
        <select v-model="form.category" required>
          <option v-for="c in currentCategories" :key="c" :value="c">{{ c }}</option>
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

      <LocationPicker v-if="entryType === 'expense'" v-model="form.location" />

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
        <button type="submit" class="save" :class="entryType" :disabled="submitting">
          {{
            submitting
              ? 'Saving…'
              : isEditing
                ? 'Save changes'
                : entryType === 'income' ? 'Save Income' : 'Save Expense'
          }}
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
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
}
.save:hover:not(:disabled) {
  filter: brightness(1.08);
}

/* ── Type toggle ──────────────────────────────────────── */
.type-toggle {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.4rem;
  background: var(--color-surface-2);
  padding: 0.3rem;
  border-radius: 10px;
  margin-bottom: 0.25rem;
}
.type-toggle button {
  background: transparent;
  border: none;
  padding: 0.6rem 0.5rem;
  border-radius: 7px;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  color: var(--color-text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: background 0.12s, color 0.12s, box-shadow 0.12s;
}
.type-toggle button .icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
  background: var(--color-surface-3);
  color: var(--color-text-muted);
  line-height: 1;
}
.type-toggle button.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-sm);
}
.type-toggle.expense button.active .icon {
  background: #dc2626;
  color: white;
}
.type-toggle.income button.active .icon {
  background: #00bb77;
  color: white;
}
.edit-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--color-info-bg);
  color: var(--color-info-text);
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}
.edit-banner .icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 0.85rem;
  color: white;
}
.edit-banner.expense .icon { background: #dc2626; }
.edit-banner.income .icon { background: #00bb77; }
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
