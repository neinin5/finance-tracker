import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const addModalOpen = ref(false)
  const sidebarOpen = ref(false)

  function openAddModal() {
    addModalOpen.value = true
  }
  function closeAddModal() {
    addModalOpen.value = false
  }
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }
  function closeSidebar() {
    sidebarOpen.value = false
  }

  return {
    addModalOpen,
    sidebarOpen,
    openAddModal,
    closeAddModal,
    toggleSidebar,
    closeSidebar
  }
})
