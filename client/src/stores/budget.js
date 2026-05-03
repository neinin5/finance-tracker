import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'
import { useExpensesStore } from './expenses'

export const useBudgetStore = defineStore('budget', () => {
  const monthlyLimitGBP = ref(null)
  const spentThisMonthGBP = ref(0)
  const currentMonth = ref('')
  const loading = ref(false)
  const saving = ref(false)
  const error = ref(null)

  const remainingGBP = computed(() => {
    if (monthlyLimitGBP.value === null) return null
    return monthlyLimitGBP.value - spentThisMonthGBP.value
  })

  const usedPercent = computed(() => {
    if (!monthlyLimitGBP.value) return 0
    return Math.min(100, (spentThisMonthGBP.value / monthlyLimitGBP.value) * 100)
  })

  const overBudget = computed(() =>
    monthlyLimitGBP.value !== null && spentThisMonthGBP.value > monthlyLimitGBP.value
  )

  async function fetchBudget() {
    loading.value = true
    error.value = null
    try {
      const data = await api('/budget')
      monthlyLimitGBP.value = data.monthlyLimitGBP
      spentThisMonthGBP.value = data.spentThisMonthGBP
      currentMonth.value = data.currentMonth
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  async function saveBudget(limitGBP) {
    saving.value = true
    error.value = null
    try {
      const data = await api('/budget', {
        method: 'PUT',
        body: { monthlyLimitGBP: limitGBP }
      })
      monthlyLimitGBP.value = data.monthlyLimitGBP
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  async function resetBudget() {
    saving.value = true
    error.value = null
    try {
      await api('/budget', { method: 'DELETE' })
      monthlyLimitGBP.value = null
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      saving.value = false
    }
  }

  /** Refresh spent amount from the expenses store (avoids extra API call) */
  function syncFromExpenses() {
    const store = useExpensesStore()
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    currentMonth.value = monthStr
    spentThisMonthGBP.value = store.expenses
      .filter((e) => e.date.startsWith(monthStr))
      .reduce((s, e) => s + e.amountGBP, 0)
  }

  return {
    monthlyLimitGBP,
    spentThisMonthGBP,
    currentMonth,
    loading,
    saving,
    error,
    remainingGBP,
    usedPercent,
    overBudget,
    fetchBudget,
    saveBudget,
    resetBudget,
    syncFromExpenses
  }
})
