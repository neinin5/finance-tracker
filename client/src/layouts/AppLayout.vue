<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import Sidebar from '../components/Sidebar.vue'
import AddExpenseModal from '../components/AddExpenseModal.vue'
import ToastContainer from '../components/ToastContainer.vue'
import QuickFAB from '../components/QuickFAB.vue'
import ShortcutsHelp from '../components/ShortcutsHelp.vue'
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'

const ui = useUiStore()
const expenseStore = useExpensesStore()
const router = useRouter()

const pendingG = ref(false)
let gTimer = null

function handleKey(e) {
  // Ignore when typing in inputs
  const tag = e.target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable) return
  if (e.metaKey || e.ctrlKey || e.altKey) return

  if (e.key === 'Escape') {
    if (ui.shortcutsOpen) ui.closeShortcuts()
    else if (ui.addModalOpen) ui.closeAddModal()
    return
  }

  if (e.key === '?') { ui.openShortcuts(); e.preventDefault(); return }

  if (pendingG.value) {
    pendingG.value = false
    clearTimeout(gTimer)
    const map = {
      d: '/dashboard', s: '/split', e: '/expenses',
      t: '/trends', c: '/calendar', r: '/exchange-rate',
      i: '/import', b: '/backups', x: '/settings', m: '/map'
    }
    const path = map[e.key.toLowerCase()]
    if (path) router.push(path)
    return
  }

  const k = e.key.toLowerCase()
  if (k === 'n') { ui.openAddModal(); e.preventDefault() }
  else if (k === 't') { ui.toggleTheme() }
  else if (k === 'g') {
    pendingG.value = true
    gTimer = setTimeout(() => (pendingG.value = false), 1200)
  }
}

onMounted(() => {
  if (!expenseStore.expenses.length) expenseStore.fetchAll()
  window.addEventListener('keydown', handleKey)
})
onBeforeUnmount(() => window.removeEventListener('keydown', handleKey))
</script>

<template>
  <div class="layout">
    <Sidebar />

    <button
      class="hamburger"
      aria-label="Open menu"
      @click="ui.toggleSidebar"
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

    <div
      v-if="ui.sidebarOpen"
      class="backdrop"
      @click="ui.closeSidebar"
    ></div>

    <div v-if="pendingG" class="g-hint">G — press D/S/E/T/C/R/I…</div>

    <main class="content">
      <router-view v-slot="{ Component }">
        <transition name="page" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <QuickFAB />
    <AddExpenseModal />
    <ShortcutsHelp />
    <ToastContainer />
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  min-height: 100vh;
  background: var(--color-bg);
}
.content {
  flex: 1;
  min-width: 0;
  padding: 2rem;
}
.hamburger {
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 30;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  width: 40px;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  padding: 0;
}
.hamburger span {
  display: block;
  width: 18px;
  height: 2px;
  background: var(--color-text);
  border-radius: 2px;
}
.backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(35, 31, 32, 0.5);
  z-index: 35;
}
.g-hint {
  position: fixed;
  bottom: 5rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--uwe-black);
  color: white;
  padding: 0.5rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
  z-index: 50;
  box-shadow: var(--shadow-md);
  animation: pop 0.15s ease;
}
@keyframes pop {
  from { opacity: 0; transform: translate(-50%, 4px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

.page-enter-active, .page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; transform: translateY(-6px); }

@media (max-width: 768px) {
  .hamburger { display: flex; }
  .backdrop { display: block; }
  .content { padding: 4rem 1rem 1rem; }
}
</style>
