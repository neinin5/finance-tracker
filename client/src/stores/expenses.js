import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'
import { EXCHANGE_RATE_THB_PER_GBP } from '../composables/useCurrency'

const INITIAL_FUND_THB = 1_500_000

function weekStartISO(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export const useExpensesStore = defineStore('expenses', () => {
  const expenses = ref([])
  const loading = ref(false)
  const error = ref(null)

  const totalSpentTHB = computed(() =>
    expenses.value.reduce((sum, e) => sum + e.amountTHB, 0)
  )
  const totalSpentGBP = computed(() =>
    expenses.value.reduce((sum, e) => sum + e.amountGBP, 0)
  )
  const remainingTHB = computed(() => INITIAL_FUND_THB - totalSpentTHB.value)
  const remainingGBP = computed(
    () => remainingTHB.value / EXCHANGE_RATE_THB_PER_GBP
  )
  const initialFundGBP = INITIAL_FUND_THB / EXCHANGE_RATE_THB_PER_GBP

  const spentByCategory = computed(() => {
    const byCategory = {}
    for (const e of expenses.value) {
      byCategory[e.category] = (byCategory[e.category] || 0) + e.amountTHB
    }
    return byCategory
  })

  const spentByDay = computed(() => {
    const byDay = {}
    for (const e of expenses.value) {
      byDay[e.date] = (byDay[e.date] || 0) + e.amountTHB
    }
    return byDay
  })

  const spentByWeek = computed(() => {
    const byWeek = {}
    for (const e of expenses.value) {
      const week = weekStartISO(e.date)
      byWeek[week] = (byWeek[week] || 0) + e.amountTHB
    }
    return byWeek
  })

  const spentByMonth = computed(() => {
    const byMonth = {}
    for (const e of expenses.value) {
      const month = e.date.slice(0, 7)
      byMonth[month] = (byMonth[month] || 0) + e.amountTHB
    }
    return byMonth
  })

  const spentByYear = computed(() => {
    const byYear = {}
    for (const e of expenses.value) {
      const year = e.date.slice(0, 4)
      byYear[year] = (byYear[year] || 0) + e.amountTHB
    }
    return byYear
  })

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      expenses.value = await api('/expenses')
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function addExpense(input) {
    const created = await api('/expenses', { method: 'POST', body: input })
    expenses.value.unshift(created)
    return created
  }

  async function deleteExpense(id) {
    await api(`/expenses/${id}`, { method: 'DELETE' })
    expenses.value = expenses.value.filter((e) => e._id !== id)
  }

  async function importGoogleSheet() {
    const result = await api('/import/google-sheet', { method: 'POST' })
    await fetchAll()
    return result
  }

  function reset() {
    expenses.value = []
    error.value = null
  }

  return {
    expenses,
    loading,
    error,
    initialFundTHB: INITIAL_FUND_THB,
    initialFundGBP,
    exchangeRate: EXCHANGE_RATE_THB_PER_GBP,
    totalSpentTHB,
    totalSpentGBP,
    remainingTHB,
    remainingGBP,
    spentByCategory,
    spentByDay,
    spentByWeek,
    spentByMonth,
    spentByYear,
    fetchAll,
    addExpense,
    deleteExpense,
    importGoogleSheet,
    reset
  }
})
