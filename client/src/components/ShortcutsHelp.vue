<script setup>
import { useUiStore } from '../stores/ui'
const ui = useUiStore()

const shortcuts = [
  { keys: ['N'], desc: 'Add new expense' },
  { keys: ['G', 'D'], desc: 'Go to Dashboard' },
  { keys: ['G', 'S'], desc: 'Go to Split View' },
  { keys: ['G', 'E'], desc: 'Go to Expenses' },
  { keys: ['G', 'T'], desc: 'Go to Trends' },
  { keys: ['G', 'C'], desc: 'Go to Calendar' },
  { keys: ['T'], desc: 'Toggle dark mode' },
  { keys: ['?'], desc: 'Show this help' },
  { keys: ['Esc'], desc: 'Close modal' }
]
</script>

<template>
  <Teleport to="body">
    <div v-if="ui.shortcutsOpen" class="overlay" @click.self="ui.closeShortcuts">
      <div class="modal" role="dialog" aria-label="Keyboard shortcuts">
        <div class="head">
          <h3>Keyboard Shortcuts</h3>
          <button class="close" @click="ui.closeShortcuts" aria-label="Close">×</button>
        </div>
        <ul class="list">
          <li v-for="s in shortcuts" :key="s.desc">
            <span class="desc">{{ s.desc }}</span>
            <span class="keys">
              <template v-for="(k, i) in s.keys" :key="k">
                <span v-if="i > 0" class="then">then</span>
                <span class="kbd">{{ k }}</span>
              </template>
            </span>
          </li>
        </ul>
        <p class="note">Press <span class="kbd">?</span> anywhere to open this dialog.</p>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(35, 31, 32, 0.55);
  display: grid;
  place-items: center;
  z-index: 90;
  padding: 1rem;
  animation: fade 0.15s ease;
}
@keyframes fade { from { opacity: 0; } to { opacity: 1; } }
.modal {
  background: var(--color-surface);
  border-radius: 14px;
  width: 100%;
  max-width: 420px;
  padding: 1.5rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
}
.head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.head h3 { margin: 0; font-size: 1.1rem; color: var(--color-text); }
.close {
  background: transparent; border: none; font-size: 1.5rem;
  cursor: pointer; color: var(--color-text-muted); line-height: 1;
}
.list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
.list li {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.55rem 0; border-bottom: 1px solid var(--color-border-light);
  font-size: 0.9rem; color: var(--color-text);
}
.list li:last-child { border-bottom: none; }
.keys { display: flex; align-items: center; gap: 0.4rem; }
.then { font-size: 0.75rem; color: var(--color-text-faded); }
.note { margin: 1rem 0 0; font-size: 0.78rem; color: var(--color-text-faded); text-align: center; }
</style>
