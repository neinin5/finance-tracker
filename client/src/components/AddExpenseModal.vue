<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Modal from './Modal.vue'
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'
import { gbpToThb, formatTHB } from '../composables/useCurrency'

const ui = useUiStore()
const expenseStore = useExpensesStore()

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
  amountGBP: ''
})

const form = reactive(initialForm())
const submitting = ref(false)
const error = ref('')

const previewTHB = computed(() => {
  const n = Number(form.amountGBP)
  if (!n || isNaN(n) || n <= 0) return null
  return formatTHB(gbpToThb(n))
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
  const amount = Number(form.amountGBP)
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
      amountGBP: amount
    })
    ui.closeAddModal()
  } catch (err) {
    error.value = err.message || 'Could not save the expense.'
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

      <label>
        Amount in GBP
        <div class="input-with-prefix">
          <span class="prefix">£</span>
          <input
            v-model="form.amountGBP"
            type="number"
            step="0.01"
            min="0"
            required
            placeholder="0.00"
            autofocus
          />
        </div>
      </label>

      <p v-if="previewTHB" class="preview">≈ {{ previewTHB }}</p>
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
  color: #374151;
  font-weight: 500;
}
input,
select {
  padding: 0.6rem 0.8rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  width: 100%;
  background: white;
}
input:focus,
select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.15);
}
.input-with-prefix {
  position: relative;
}
.prefix {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 500;
}
.input-with-prefix input {
  padding-left: 1.85rem;
}
.preview {
  margin: -0.25rem 0 0;
  font-size: 0.875rem;
  color: #667eea;
  font-weight: 500;
}
.error {
  margin: 0;
  background: #fef2f2;
  color: #b91c1c;
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
  background: white;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}
.cancel:hover:not(:disabled) {
  background: #f9fafb;
}
.save {
  background: #667eea;
  color: white;
}
.save:hover:not(:disabled) {
  background: #5568d3;
}
.actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
