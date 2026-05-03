<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useExpensesStore } from '../stores/expenses'
import { useUiStore } from '../stores/ui'
import { useToastStore } from '../stores/toast'
import { formatGBP, formatTHB } from '../composables/useCurrency'

const router = useRouter()
const auth = useAuthStore()
const expenses = useExpensesStore()
const ui = useUiStore()
const toast = useToastStore()

// ── Scholarship ─────────────────────────────────────────────
const fundInput = ref('')
const rateInput = ref('')
const savingFund = ref(false)

watch(
  () => auth.user,
  (u) => {
    if (u) {
      fundInput.value = String(u.initialFundTHB ?? 1500000)
      rateInput.value = String(u.exchangeRate ?? 45)
    }
  },
  { immediate: true }
)

const fundGBPPreview = computed(() => {
  const t = Number(fundInput.value)
  const r = Number(rateInput.value)
  if (!t || !r) return '—'
  return formatGBP(t / r)
})

async function saveFundSettings() {
  const t = Number(fundInput.value)
  const r = Number(rateInput.value)
  if (!t || t <= 0) return toast.error('Fund must be a positive number')
  if (!r || r <= 0) return toast.error('Rate must be a positive number')
  savingFund.value = true
  try {
    await auth.updateSettings({ initialFundTHB: t, exchangeRate: r })
    toast.success('Scholarship settings saved')
  } catch (err) {
    toast.error(err.message || 'Failed to save')
  } finally {
    savingFund.value = false
  }
}

function resetFundDefaults() {
  fundInput.value = '1500000'
  rateInput.value = '45'
}

// ── Account ─────────────────────────────────────────────────
const pwCurrent = ref('')
const pwNew = ref('')
const pwConfirm = ref('')
const changingPw = ref(false)

async function handleChangePassword() {
  if (pwNew.value.length < 6) return toast.error('New password must be at least 6 characters')
  if (pwNew.value !== pwConfirm.value) return toast.error('New passwords do not match')
  changingPw.value = true
  try {
    await auth.changePassword(pwCurrent.value, pwNew.value)
    toast.success('Password changed')
    pwCurrent.value = pwNew.value = pwConfirm.value = ''
  } catch (err) {
    toast.error(err.message || 'Could not change password')
  } finally {
    changingPw.value = false
  }
}

// ── Danger zone ─────────────────────────────────────────────
const wiping = ref(false)
async function handleClearExpenses() {
  if (!confirm(
    `Delete ALL ${expenses.expenses.length} expense records?\n\n` +
    `This cannot be undone. Consider creating a backup first.`
  )) return
  wiping.value = true
  try {
    const r = await auth.clearAllExpenses()
    await expenses.fetchAll()
    toast.success(`Deleted ${r.deleted} records`)
  } catch (err) {
    toast.error(err.message || 'Failed to clear data')
  } finally {
    wiping.value = false
  }
}

const deletePassword = ref('')
const deletingAcct = ref(false)
async function handleDeleteAccount() {
  if (!deletePassword.value) return toast.error('Enter your password to confirm')
  if (!confirm(
    'PERMANENTLY DELETE your account and ALL data?\n\n' +
    'This will remove your user, all expenses, budget, and backups. This cannot be undone.'
  )) return
  deletingAcct.value = true
  try {
    await auth.deleteAccount(deletePassword.value)
    toast.success('Account deleted')
    auth.logout()
    expenses.reset()
    router.push('/login')
  } catch (err) {
    toast.error(err.message || 'Failed to delete account')
  } finally {
    deletingAcct.value = false
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Settings</h1>
        <p>Adjust your scholarship, account, and app preferences.</p>
      </div>
    </header>

    <!-- ── Scholarship ──────────────────────────────────── -->
    <section class="card">
      <div class="sec-head">
        <h2>Scholarship Fund</h2>
        <p>Initial fund amount and your reference exchange rate.</p>
      </div>
      <div class="form">
        <label class="field">
          <span>Initial fund (THB)</span>
          <div class="input-wrap">
            <span class="prefix">฿</span>
            <input v-model="fundInput" type="number" min="1" step="1" />
          </div>
        </label>
        <label class="field">
          <span>Exchange rate (THB per GBP)</span>
          <div class="input-wrap">
            <span class="prefix">฿/£</span>
            <input v-model="rateInput" type="number" min="0.01" step="0.01" />
          </div>
        </label>
        <div class="preview">
          <span class="lbl">Equivalent</span>
          <span class="val">{{ fundGBPPreview }}</span>
        </div>
        <div class="actions">
          <button class="btn ghost" @click="resetFundDefaults" type="button">Restore defaults</button>
          <button class="btn primary" :disabled="savingFund" @click="saveFundSettings">
            {{ savingFund ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
        <p class="hint">
          Your remaining balance is recalculated immediately. Existing expense
          records keep the THB amounts they were saved with.
        </p>
      </div>
    </section>

    <!-- ── Account ──────────────────────────────────────── -->
    <section class="card">
      <div class="sec-head">
        <h2>Account</h2>
        <p>Signed in as <strong>{{ auth.user?.username }}</strong>.</p>
      </div>

      <div class="form">
        <h3 class="sub-h">Change password</h3>
        <label class="field">
          <span>Current password</span>
          <input v-model="pwCurrent" type="password" autocomplete="current-password" />
        </label>
        <label class="field">
          <span>New password</span>
          <input v-model="pwNew" type="password" autocomplete="new-password" />
        </label>
        <label class="field">
          <span>Confirm new password</span>
          <input v-model="pwConfirm" type="password" autocomplete="new-password" />
        </label>
        <div class="actions">
          <button class="btn primary" :disabled="changingPw" @click="handleChangePassword">
            {{ changingPw ? 'Updating…' : 'Update password' }}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Display ──────────────────────────────────────── -->
    <section class="card">
      <div class="sec-head">
        <h2>Appearance</h2>
        <p>Theme used across the app.</p>
      </div>
      <div class="theme-row">
        <button
          class="theme-btn"
          :class="{ active: ui.theme === 'light' }"
          @click="ui.theme === 'dark' && ui.toggleTheme()"
        >
          ☼ Light
        </button>
        <button
          class="theme-btn"
          :class="{ active: ui.theme === 'dark' }"
          @click="ui.theme === 'light' && ui.toggleTheme()"
        >
          ☾ Dark
        </button>
      </div>
    </section>

    <!-- ── Danger zone ──────────────────────────────────── -->
    <section class="card danger">
      <div class="sec-head">
        <h2>Danger Zone</h2>
        <p>Irreversible actions — please proceed carefully.</p>
      </div>

      <div class="danger-row">
        <div>
          <h4>Clear all expenses</h4>
          <p class="hint">
            Delete every expense record ({{ expenses.expenses.length }} total).
            Budget, backups, and account stay intact.
          </p>
        </div>
        <button class="btn danger-btn" :disabled="wiping" @click="handleClearExpenses">
          {{ wiping ? 'Working…' : 'Clear data' }}
        </button>
      </div>

      <div class="danger-row">
        <div class="grow">
          <h4>Delete account</h4>
          <p class="hint">
            Permanently remove your user, expenses, budget, and backups.
          </p>
          <input
            v-model="deletePassword"
            type="password"
            placeholder="Enter password to confirm"
            autocomplete="current-password"
            class="del-input"
          />
        </div>
        <button class="btn danger-btn" :disabled="deletingAcct" @click="handleDeleteAccount">
          {{ deletingAcct ? 'Working…' : 'Delete account' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--color-text); }
.page-head p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; }

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  margin-bottom: 1.25rem;
}
.card.danger { border-color: rgba(220, 38, 38, 0.3); }

.sec-head { margin-bottom: 1.25rem; }
.sec-head h2 { margin: 0 0 0.25rem; font-size: 1.05rem; color: var(--color-text); }
.sec-head p { margin: 0; color: var(--color-text-muted); font-size: 0.85rem; }
.sub-h {
  margin: 0 0 0.4rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  font-weight: 700;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  max-width: 460px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  font-weight: 500;
}
.field input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
  width: 100%;
  box-sizing: border-box;
}
.field input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 187, 119, 0.15);
}
.input-wrap {
  position: relative;
}
.input-wrap .prefix {
  position: absolute;
  left: 0.85rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  font-weight: 500;
  font-size: 0.85rem;
  pointer-events: none;
}
.input-wrap input { padding-left: 2.4rem; }

.preview {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.preview .lbl {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
  font-weight: 700;
}
.preview .val { font-size: 1rem; font-weight: 700; color: var(--color-accent); }

.actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.btn {
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.ghost { background: var(--color-surface-2); color: var(--color-text-muted); }
.btn.ghost:hover:not(:disabled) { color: var(--color-text); }
.btn.primary {
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border-color: transparent;
}
.btn.primary:hover:not(:disabled) { filter: brightness(1.1); }
.btn.danger-btn {
  background: transparent;
  color: var(--color-error-text);
  border-color: var(--color-error-text);
}
.btn.danger-btn:hover:not(:disabled) {
  background: var(--color-error-bg);
}
.hint {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-faded);
  line-height: 1.5;
}

.theme-row {
  display: flex;
  gap: 0.5rem;
}
.theme-btn {
  flex: 1;
  max-width: 160px;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 600;
}
.theme-btn:hover { color: var(--color-text); }
.theme-btn.active {
  border-color: var(--color-accent);
  background: var(--color-info-bg);
  color: var(--color-accent);
}

.danger-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--color-border-light);
  flex-wrap: wrap;
}
.danger-row:first-of-type { padding-top: 0; border-top: none; }
.danger-row > div { flex: 1; min-width: 200px; }
.danger-row .grow { display: flex; flex-direction: column; gap: 0.5rem; }
.danger-row h4 { margin: 0 0 0.25rem; font-size: 0.95rem; color: var(--color-text); }
.del-input {
  padding: 0.55rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  font-size: 0.9rem;
  max-width: 280px;
  outline: none;
}
.del-input:focus { border-color: var(--color-error-text); }
</style>
