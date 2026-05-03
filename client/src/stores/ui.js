import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

const THEME_KEY = 'uk-tracker-theme'

function detectTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved === 'light' || saved === 'dark') return saved
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }
  return 'light'
}

export const useUiStore = defineStore('ui', () => {
  const addModalOpen = ref(false)
  const sidebarOpen = ref(false)
  const shortcutsOpen = ref(false)
  const theme = ref(detectTheme())

  document.documentElement.setAttribute('data-theme', theme.value)
  watch(theme, (val) => {
    document.documentElement.setAttribute('data-theme', val)
    localStorage.setItem(THEME_KEY, val)
  })

  function openAddModal() { addModalOpen.value = true }
  function closeAddModal() { addModalOpen.value = false }
  function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
  function closeSidebar() { sidebarOpen.value = false }
  function openShortcuts() { shortcutsOpen.value = true }
  function closeShortcuts() { shortcutsOpen.value = false }
  function toggleTheme() { theme.value = theme.value === 'light' ? 'dark' : 'light' }

  return {
    addModalOpen,
    sidebarOpen,
    shortcutsOpen,
    theme,
    openAddModal,
    closeAddModal,
    toggleSidebar,
    closeSidebar,
    openShortcuts,
    closeShortcuts,
    toggleTheme
  }
})
