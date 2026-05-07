import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'

export const INCOME_CATEGORIES = [
  'Scholarship',
  'Salary',
  'Part-time',
  'Family',
  'Gift',
  'Refund',
  'Bonus',
  'Other'
]

export const useIncomeStore = defineStore('income', () => {
  const incomes = ref([])
  const loading = ref(false)
  const error = ref(null)

  const totalIncomeTHB = computed(() =>
    incomes.value.reduce((sum, i) => sum + i.amountTHB, 0)
  )
  const totalIncomeGBP = computed(() =>
    incomes.value.reduce((sum, i) => sum + i.amountGBP, 0)
  )

  const incomeByCategory = computed(() => {
    const byCat = {}
    for (const i of incomes.value) {
      byCat[i.category] = (byCat[i.category] || 0) + i.amountTHB
    }
    return byCat
  })

  const incomeByMonth = computed(() => {
    const byMonth = {}
    for (const i of incomes.value) {
      const m = i.date.slice(0, 7)
      byMonth[m] = (byMonth[m] || 0) + i.amountTHB
    }
    return byMonth
  })

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      incomes.value = await api('/incomes')
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addIncome(input) {
    const created = await api('/incomes', { method: 'POST', body: input })
    incomes.value.unshift(created)
    return created
  }

  async function updateIncome(id, input) {
    const updated = await api(`/incomes/${id}`, { method: 'PUT', body: input })
    const idx = incomes.value.findIndex((i) => i._id === id)
    if (idx >= 0) incomes.value.splice(idx, 1, updated)
    return updated
  }

  async function deleteIncome(id) {
    await api(`/incomes/${id}`, { method: 'DELETE' })
    incomes.value = incomes.value.filter((i) => i._id !== id)
  }

  function reset() {
    incomes.value = []
    error.value = null
  }

  return {
    incomes,
    loading,
    error,
    totalIncomeTHB,
    totalIncomeGBP,
    incomeByCategory,
    incomeByMonth,
    fetchAll,
    addIncome,
    updateIncome,
    deleteIncome,
    reset
  }
})
