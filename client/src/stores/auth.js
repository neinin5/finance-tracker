import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, setToken, getToken } from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const needsSetup = ref(false)
  const ready = ref(false)
  let bootstrapPromise = null

  const isAuthenticated = computed(() => user.value !== null)

  function bootstrap() {
    if (!bootstrapPromise) bootstrapPromise = doBootstrap()
    return bootstrapPromise
  }

  async function doBootstrap() {
    try {
      const status = await api('/auth/status', { auth: false })
      needsSetup.value = status.needsSetup
      const token = getToken()
      if (token) {
        try {
          user.value = await api('/auth/me')
        } catch {
          setToken(null)
          user.value = null
        }
      }
    } finally {
      ready.value = true
    }
  }

  async function setup(username, password) {
    const data = await api('/auth/setup', {
      method: 'POST',
      body: { username, password },
      auth: false
    })
    setToken(data.token)
    user.value = data.user
    needsSetup.value = false
  }

  async function login(username, password) {
    const data = await api('/auth/login', {
      method: 'POST',
      body: { username, password },
      auth: false
    })
    setToken(data.token)
    user.value = data.user
  }

  function logout() {
    setToken(null)
    user.value = null
  }

  async function updateSettings(patch) {
    const updated = await api('/auth/settings', { method: 'PATCH', body: patch })
    user.value = updated
    return updated
  }

  async function changePassword(currentPassword, newPassword) {
    return api('/auth/password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    })
  }

  async function clearAllExpenses() {
    return api('/auth/expenses', { method: 'DELETE' })
  }

  async function deleteAccount(password) {
    return api('/auth/account', { method: 'DELETE', body: { password } })
  }

  return {
    user,
    isAuthenticated,
    needsSetup,
    ready,
    bootstrap,
    setup,
    login,
    logout,
    updateSettings,
    changePassword,
    clearAllExpenses,
    deleteAccount
  }
})
