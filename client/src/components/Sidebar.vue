<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useUiStore } from '../stores/ui'
import { useExpensesStore } from '../stores/expenses'
import { useIncomeStore } from '../stores/income'
import { useToastStore } from '../stores/toast'
import { api } from '../api/client'

const router = useRouter()
const auth = useAuthStore()
const ui = useUiStore()
const expenseStore = useExpensesStore()
const incomeStore = useIncomeStore()
const toast = useToastStore()

const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { name: 'Dashboard', to: '/dashboard' },
      { name: 'Split View', to: '/split' }
    ]
  },
  {
    title: 'Tracking',
    items: [
      { name: 'Expenses', to: '/expenses' },
      { name: 'Income', to: '/income' },
      { name: 'Trends', to: '/trends' },
      { name: 'Calendar', to: '/calendar' },
      { name: 'Map', to: '/map' }
    ]
  },
  {
    title: 'Markets',
    items: [{ name: 'Exchange Rate', to: '/exchange-rate' }]
  },
  {
    title: 'Tools',
    items: [
      { name: 'Import Data', to: '/import' },
      { name: 'Backups', to: '/backups' }
    ]
  },
  {
    title: 'Account',
    items: [{ name: 'Settings', to: '/settings' }]
  }
]

const expanded = ref(
  Object.fromEntries(NAV_SECTIONS.map((s) => [s.title, true]))
)

const sendingEmail = ref(false)
const emailMsg = ref('')

function toggle(title) {
  expanded.value[title] = !expanded.value[title]
}

function handleNav() {
  ui.closeSidebar()
}

async function handleEmailSummary() {
  sendingEmail.value = true
  emailMsg.value = ''
  try {
    const r = await api('/notifications/weekly-summary', { method: 'POST' })
    emailMsg.value = `Sent to ${r.recipient}`
    toast.success(`Weekly summary sent to ${r.recipient}`)
  } catch (err) {
    emailMsg.value = err.message
    toast.error(err.message)
  } finally {
    sendingEmail.value = false
    setTimeout(() => (emailMsg.value = ''), 5000)
  }
}

function handleLogout() {
  auth.logout()
  expenseStore.reset()
  incomeStore.reset()
  ui.closeSidebar()
  router.push('/login')
}
</script>

<template>
  <aside class="sidebar" :class="{ open: ui.sidebarOpen }">
    <div class="brand">
      <div class="logo-wrap">
        <div class="logo-mark">UWE</div>
        <h1>Finance Tracker</h1>
      </div>
      <button
        class="close-mobile"
        @click="ui.closeSidebar"
        aria-label="Close menu"
      >
        ×
      </button>
    </div>

    <button class="add-record" @click="ui.openAddModal">
      <span class="plus">+</span> Add Record
    </button>

    <nav>
      <div v-for="section in NAV_SECTIONS" :key="section.title" class="section">
        <button
          class="section-header"
          @click="toggle(section.title)"
          :aria-expanded="expanded[section.title]"
        >
          <span class="caret" :class="{ open: expanded[section.title] }"></span>
          {{ section.title }}
        </button>
        <ul v-show="expanded[section.title]" class="items">
          <li v-for="item in section.items" :key="item.name">
            <router-link :to="item.to" @click="handleNav">
              {{ item.name }}
            </router-link>
          </li>
        </ul>
      </div>
    </nav>

    <div class="footer">
      <button class="footer-btn" @click="handleEmailSummary" :disabled="sendingEmail">
        <span>{{ sendingEmail ? 'Sending…' : 'Email weekly summary' }}</span>
      </button>
      <p v-if="emailMsg" class="email-msg">{{ emailMsg }}</p>

      <button class="footer-btn theme" @click="ui.toggleTheme">
        <span>{{ ui.theme === 'dark' ? '☼ Light mode' : '☾ Dark mode' }}</span>
      </button>

      <p class="user">{{ auth.user?.username }}</p>
      <button class="logout" @click="handleLogout">Log out</button>
    </div>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 240px;
  background: #231F20;
  color: #e5e7eb;
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: sticky;
  top: 0;
  flex-shrink: 0;
  overflow-y: auto;
}
[data-theme='dark'] .sidebar {
  background: #07120c;
}
.brand {
  padding: 1.5rem 1.25rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.logo-wrap {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo-mark {
  background: #E62333;
  color: white;
  font-weight: 900;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(230, 35, 51, 0.4);
  font-family: 'Helvetica Neue', Arial, sans-serif;
}
.brand h1 {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #f5f5f5;
}
.close-mobile {
  display: none;
  background: transparent;
  border: none;
  color: #e5e7eb;
  font-size: 1.5rem;
  cursor: pointer;
  line-height: 1;
}
.add-record {
  margin: 0 1rem 1rem;
  padding: 0.7rem;
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  transition: filter 0.15s, transform 0.05s;
}
.add-record:hover {
  filter: brightness(1.1);
}
.add-record:active {
  transform: scale(0.98);
}
.plus {
  font-size: 1.1rem;
  font-weight: 700;
}
nav {
  flex: 1;
  padding: 0 0.5rem;
}
.section {
  margin-bottom: 0.5rem;
}
.section-header {
  width: 100%;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-family: inherit;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 6px;
}
.section-header:hover {
  background: rgba(255, 255, 255, 0.04);
  color: #d1d5db;
}
.caret {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-right: 2px solid currentColor;
  border-bottom: 2px solid currentColor;
  transform: rotate(-45deg);
  transition: transform 0.18s;
  margin-left: 2px;
}
.caret.open {
  transform: rotate(45deg);
}
.items {
  list-style: none;
  margin: 0;
  padding: 0.15rem 0 0.25rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}
.items a {
  display: block;
  padding: 0.55rem 0.85rem;
  color: #d1d5db;
  text-decoration: none;
  font-size: 0.9rem;
  border-radius: 6px;
  transition: background 0.12s, color 0.12s;
}
.items a:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}
.items a.router-link-active {
  background: rgba(0, 187, 119, 0.2);
  color: white;
  font-weight: 500;
  border-left: 3px solid #00bb77;
  padding-left: calc(0.85rem - 3px);
}
.footer {
  padding: 1rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.footer-btn {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #d1d5db;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-family: inherit;
  text-align: center;
}
.footer-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}
.footer-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.footer-btn.theme {
  margin-bottom: 0.4rem;
}
.email-msg {
  margin: 0 0 0.25rem;
  font-size: 0.7rem;
  color: #2ddb95;
  text-align: center;
}
.user {
  margin: 0.5rem 0 0.4rem;
  font-size: 0.85rem;
  color: #9ca3af;
  text-align: center;
}
.logout {
  width: 100%;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #d1d5db;
  padding: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
}
.logout:hover {
  background: rgba(255, 255, 255, 0.05);
  color: white;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 40;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.3);
  }
  .sidebar.open {
    transform: translateX(0);
  }
  .close-mobile {
    display: block;
  }
}
</style>
