import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../api/client'

export const useExchangeRateStore = defineStore('exchangeRate', () => {
  const rates = ref([])
  const fetchedAt = ref(null)
  const note = ref('')
  const loading = ref(false)
  const error = ref(null)

  const latest = computed(() => rates.value[rates.value.length - 1] || null)
  const previous = computed(
    () => rates.value[rates.value.length - 2] || null
  )
  const change = computed(() => {
    if (!latest.value || !previous.value) return null
    return latest.value.rate - previous.value.rate
  })
  const changePercent = computed(() => {
    if (!latest.value || !previous.value) return null
    return ((latest.value.rate - previous.value.rate) / previous.value.rate) * 100
  })

  async function fetchHistory(days = 30) {
    loading.value = true
    error.value = null
    try {
      const data = await api(`/exchange-rate?days=${days}`)
      rates.value = data.rates
      fetchedAt.value = data.fetchedAt
      note.value = data.note
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  return {
    rates,
    fetchedAt,
    note,
    loading,
    error,
    latest,
    previous,
    change,
    changePercent,
    fetchHistory
  }
})
