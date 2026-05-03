<script setup>
import { ref, onMounted, computed } from 'vue'
import { useBackupsStore } from '../stores/backups'
import { useExpensesStore } from '../stores/expenses'
import { useToastStore } from '../stores/toast'
import { formatGBP, formatTHB } from '../composables/useCurrency'

const backups = useBackupsStore()
const expenses = useExpensesStore()
const toast = useToastStore()

const label = ref('')

onMounted(() => backups.fetchAll())

async function handleCreate() {
  try {
    const b = await backups.createBackup(label.value.trim())
    toast.success(`Backup saved · ${b.expenseCount} records`)
    label.value = ''
  } catch (err) {
    toast.error(err.message || 'Backup failed')
  }
}

async function handleRestore(b) {
  if (!confirm(
    `Restore backup "${b.label}"?\n\n` +
    `This will REPLACE all current expenses (${expenses.expenses.length}) ` +
    `with ${b.expenseCount} records from ${formatDate(b.createdAt)}.`
  )) return
  try {
    const r = await backups.restore(b._id)
    await expenses.fetchAll()
    toast.success(`Restored ${r.restored} records`)
  } catch (err) {
    toast.error(err.message || 'Restore failed')
  }
}

async function handleDelete(b) {
  if (!confirm(`Delete backup "${b.label}"? This cannot be undone.`)) return
  try {
    await backups.remove(b._id)
    toast.info('Backup deleted')
  } catch (err) {
    toast.error(err.message || 'Delete failed')
  }
}

async function handleDownload(b) {
  try {
    const full = await backups.getOne(b._id)
    const blob = new Blob([JSON.stringify(full, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-${b._id}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Backup downloaded')
  } catch (err) {
    toast.error(err.message || 'Download failed')
  }
}

function formatDate(iso) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const totalSize = computed(() =>
  backups.backups.reduce((s, b) => s + (b.expenseCount || 0), 0)
)
</script>

<template>
  <div>
    <header class="page-head">
      <div>
        <h1>Backups</h1>
        <p>Save snapshots of your data to MongoDB. Restore at any time.</p>
      </div>
    </header>

    <div class="grid">
      <!-- ── Create ──────────────────────────────────────────── -->
      <div class="card create-card">
        <h3>Create New Backup</h3>
        <p class="desc">
          Snapshots all <strong>{{ expenses.expenses.length }}</strong> current
          expenses and your monthly budget into a separate collection.
        </p>
        <div class="create-row">
          <input
            v-model="label"
            type="text"
            placeholder="Optional label (e.g. 'Before Easter trip')"
            maxlength="100"
            @keyup.enter="handleCreate"
          />
          <button class="primary" :disabled="backups.working" @click="handleCreate">
            {{ backups.working ? 'Saving…' : 'Backup Now' }}
          </button>
        </div>
      </div>

      <!-- ── Stats ───────────────────────────────────────────── -->
      <div class="card stats-card">
        <h3>Backup Library</h3>
        <dl class="stats">
          <div>
            <dt>Total backups</dt>
            <dd>{{ backups.backups.length }}</dd>
          </div>
          <div>
            <dt>Records saved</dt>
            <dd>{{ totalSize.toLocaleString() }}</dd>
          </div>
          <div v-if="backups.backups[0]">
            <dt>Latest</dt>
            <dd>{{ formatDate(backups.backups[0].createdAt) }}</dd>
          </div>
        </dl>
      </div>
    </div>

    <!-- ── List ────────────────────────────────────────────── -->
    <h3 class="section-title">History</h3>
    <div v-if="backups.loading" class="empty">Loading…</div>
    <div v-else-if="backups.backups.length === 0" class="empty card">
      No backups yet. Create your first backup above.
    </div>
    <div v-else class="list">
      <div v-for="b in backups.backups" :key="b._id" class="row">
        <div class="row-main">
          <div class="row-title">{{ b.label }}</div>
          <div class="row-meta">
            <span>{{ formatDate(b.createdAt) }}</span>
            <span class="dot">·</span>
            <span>{{ b.expenseCount }} records</span>
            <span class="dot">·</span>
            <span class="amt">{{ formatGBP(b.totalGBP) }}</span>
            <span class="thb">({{ formatTHB(b.totalTHB) }})</span>
            <template v-if="b.monthlyLimitGBP != null">
              <span class="dot">·</span>
              <span class="budget-tag">Budget {{ formatGBP(b.monthlyLimitGBP) }}</span>
            </template>
          </div>
        </div>
        <div class="row-actions">
          <button class="btn ghost" @click="handleDownload(b)" title="Download as JSON">↓</button>
          <button class="btn restore" @click="handleRestore(b)" :disabled="backups.working">Restore</button>
          <button class="btn danger" @click="handleDelete(b)" :disabled="backups.working" title="Delete backup">×</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head {
  margin-bottom: 1.5rem;
}
.page-head h1 {
  margin: 0 0 0.25rem;
  font-size: 1.5rem;
  color: var(--color-text);
}
.page-head p {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}
.card {
  background: var(--color-surface);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}
.card h3 {
  margin: 0 0 0.5rem;
  font-size: 1.05rem;
  color: var(--color-text);
}
.desc {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1.1rem;
}
.create-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.create-row input {
  flex: 1;
  min-width: 180px;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--color-bg);
  color: var(--color-text);
  outline: none;
}
.create-row input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(0, 187, 119, 0.15);
}
.primary {
  padding: 0.6rem 1.1rem;
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.9rem;
  white-space: nowrap;
}
.primary:hover:not(:disabled) { filter: brightness(1.1); }
.primary:disabled { opacity: 0.6; cursor: not-allowed; }

.stats {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.stats > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.4rem;
}
.stats > div:last-child { border-bottom: none; }
.stats dt {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 0.8rem;
}
.stats dd {
  margin: 0;
  font-weight: 700;
  color: var(--color-text);
  font-size: 1rem;
}

.section-title {
  margin: 1.5rem 0 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
}

.list {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--color-border-light);
  transition: background 0.12s;
}
.row:last-child { border-bottom: none; }
.row:hover { background: var(--color-surface-2); }
.row-main { flex: 1; min-width: 0; }
.row-title {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.row-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-top: 0.2rem;
}
.dot { color: var(--color-text-faded); }
.amt { color: var(--color-text); font-weight: 600; }
.thb { color: var(--color-text-faded); }
.budget-tag {
  background: var(--color-info-bg);
  color: var(--color-info-text);
  padding: 0.05rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
}

.row-actions {
  display: flex;
  gap: 0.4rem;
  flex-shrink: 0;
}
.btn {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 0.45rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-family: inherit;
  cursor: pointer;
  color: var(--color-text);
  transition: background 0.12s, border-color 0.12s, color 0.12s;
}
.btn:hover:not(:disabled) { background: var(--color-surface-2); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.ghost { color: var(--color-text-muted); padding: 0.45rem 0.65rem; font-weight: 700; }
.btn.restore {
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border-color: transparent;
  font-weight: 600;
}
.btn.restore:hover:not(:disabled) { filter: brightness(1.1); }
.btn.danger {
  color: var(--color-error-text);
  padding: 0.45rem 0.7rem;
  font-weight: 700;
  font-size: 1rem;
  line-height: 0.9;
}
.btn.danger:hover:not(:disabled) {
  background: var(--color-error-bg);
  border-color: var(--color-error-text);
}

.empty {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-faded);
  font-size: 0.9rem;
}

@media (max-width: 600px) {
  .row { flex-direction: column; align-items: stretch; }
  .row-actions { justify-content: flex-end; }
}
</style>
