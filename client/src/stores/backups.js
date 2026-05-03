import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api } from '../api/client'

export const useBackupsStore = defineStore('backups', () => {
  const backups = ref([])
  const loading = ref(false)
  const working = ref(false)
  const error = ref(null)

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      backups.value = await api('/backups')
    } catch (err) {
      error.value = err.message
      throw err
    } finally {
      loading.value = false
    }
  }

  async function createBackup(label = '') {
    working.value = true
    try {
      const created = await api('/backups', { method: 'POST', body: { label } })
      backups.value.unshift(created)
      return created
    } finally {
      working.value = false
    }
  }

  async function getOne(id) {
    return api(`/backups/${id}`)
  }

  async function restore(id) {
    working.value = true
    try {
      return await api(`/backups/${id}/restore`, { method: 'POST' })
    } finally {
      working.value = false
    }
  }

  async function remove(id) {
    working.value = true
    try {
      await api(`/backups/${id}`, { method: 'DELETE' })
      backups.value = backups.value.filter((b) => b._id !== id)
    } finally {
      working.value = false
    }
  }

  return { backups, loading, working, error, fetchAll, createBackup, getOne, restore, remove }
})
