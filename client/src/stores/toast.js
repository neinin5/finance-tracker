import { defineStore } from 'pinia'
import { ref } from 'vue'

let nextId = 1

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([])

  function push(message, type = 'info', duration = 3500) {
    const id = nextId++
    toasts.value.push({ id, message, type })
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration)
    }
    return id
  }

  function success(msg, duration) { return push(msg, 'success', duration) }
  function error(msg, duration) { return push(msg, 'error', duration ?? 5000) }
  function info(msg, duration) { return push(msg, 'info', duration) }

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, push, success, error, info, dismiss }
})
