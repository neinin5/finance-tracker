<script setup>
import { onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '' }
})
const emit = defineEmits(['close'])

function handleEscape(e) {
  if (e.key === 'Escape' && props.open) emit('close')
}

watch(
  () => props.open,
  (open) => {
    document.body.style.overflow = open ? 'hidden' : ''
  }
)

onMounted(() => window.addEventListener('keydown', handleEscape))
onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="open" class="overlay" @click.self="emit('close')">
        <div class="modal" role="dialog" aria-modal="true">
          <header class="header">
            <h2>{{ title }}</h2>
            <button class="close" @click="emit('close')" aria-label="Close">
              ×
            </button>
          </header>
          <div class="body">
            <slot />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  display: grid;
  place-items: center;
  z-index: 50;
  padding: 1rem;
  backdrop-filter: blur(2px);
}
.modal {
  background: var(--color-surface);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--color-border-light);
}
.header h2 {
  margin: 0;
  font-size: 1.05rem;
  color: var(--color-text);
}
.close {
  background: transparent;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--color-text-faded);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-family: inherit;
}
.close:hover {
  background: var(--color-surface-2);
  color: var(--color-text);
}
.body {
  padding: 1.5rem;
}
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.18s ease;
}
.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: transform 0.18s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.96);
}
</style>
