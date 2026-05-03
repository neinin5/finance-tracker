<script setup>
import { useToastStore } from '../stores/toast'

const toast = useToastStore()

const icons = { success: '✓', error: '!', info: 'ⓘ' }
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <div
        v-for="t in toast.toasts"
        :key="t.id"
        class="toast"
        :class="t.type"
      >
        <span class="toast-icon">{{ icons[t.type] || 'ⓘ' }}</span>
        <span class="toast-msg">{{ t.message }}</span>
        <button class="toast-close" @click="toast.dismiss(t.id)" aria-label="Dismiss">×</button>
      </div>
    </div>
  </Teleport>
</template>
