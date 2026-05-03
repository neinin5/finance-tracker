<script setup>
import { ref, computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { useToastStore } from '../stores/toast'

const store = useExpensesStore()
const toast = useToastStore()
const importing = ref(false)
const result = ref(null)
const error = ref('')

const sheetCount = computed(
  () => store.expenses.filter((e) => e.source === 'google-sheet').length
)
const manualCount = computed(
  () => store.expenses.filter((e) => e.source !== 'google-sheet').length
)

async function handleImport() {
  if (importing.value) return
  if (
    !confirm(
      'Import expenses from your Google Sheet?\n\n' +
        'Existing imported rows will be updated; manually-added expenses are untouched.'
    )
  )
    return
  importing.value = true
  error.value = ''
  result.value = null
  try {
    result.value = await store.importGoogleSheet()
    toast.success(
      `Import complete · ${result.value.imported} new, ${result.value.updated} updated`
    )
  } catch (err) {
    error.value = err.message || 'Import failed'
    toast.error(error.value)
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <h1>Import Data</h1>
      <p>Pull your existing expenses from the Google Sheet into MongoDB.</p>
    </header>

    <div class="grid">
      <div class="card">
        <h3>From Google Sheet</h3>
        <p class="desc">
          Fetches the configured sheet, parses each expense row, converts the
          GBP price to THB at the fixed rate (45) and upserts into the
          database. Idempotent — re-running updates rows in place.
        </p>
        <button class="primary" :disabled="importing" @click="handleImport">
          {{ importing ? 'Importing…' : 'Import Now' }}
        </button>

        <div v-if="result" class="result success">
          <p>
            <strong>Imported {{ result.imported }}</strong> new,
            <strong>updated {{ result.updated }}</strong>,
            skipped {{ result.skipped }}.
          </p>
          <ul v-if="result.errors?.length" class="errors">
            <li v-for="(err, i) in result.errors" :key="i">
              Row {{ err.row }}: {{ err.error }}
            </li>
          </ul>
        </div>
        <div v-if="error" class="result error">
          {{ error }}
        </div>
      </div>

      <div class="card">
        <h3>Current Data</h3>
        <dl class="stats">
          <div>
            <dt>Total records</dt>
            <dd>{{ store.expenses.length }}</dd>
          </div>
          <div>
            <dt>From Google Sheet</dt>
            <dd>{{ sheetCount }}</dd>
          </div>
          <div>
            <dt>Manually added</dt>
            <dd>{{ manualCount }}</dd>
          </div>
        </dl>
        <p class="hint">
          Note: the source sheet must be set to <em>Anyone with the link can
          view</em> for the importer to fetch its CSV.
        </p>
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
  gap: 1.5rem;
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
  color: var(--color-text);
  font-size: 1.1rem;
}
.desc {
  color: var(--color-text-muted);
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0 0 1.25rem;
}
.primary {
  padding: 0.7rem 1.2rem;
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
}
.primary:hover:not(:disabled) {
  filter: brightness(1.1);
}
.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.result {
  margin-top: 1rem;
  padding: 0.85rem 1rem;
  border-radius: 8px;
  font-size: 0.9rem;
}
.result p {
  margin: 0;
}
.result.success {
  background: var(--color-success-bg);
  color: var(--color-success-text);
}
.result.error {
  background: var(--color-error-bg);
  color: var(--color-error-text);
}
.errors {
  margin: 0.5rem 0 0;
  padding-left: 1.25rem;
  font-size: 0.8rem;
}
.stats {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}
.stats > div {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.4rem;
}
.stats > div:last-child {
  border-bottom: none;
}
.stats dt {
  color: var(--color-text-muted);
  font-size: 0.85rem;
  margin: 0;
}
.stats dd {
  margin: 0;
  font-weight: 700;
  color: var(--color-text);
  font-size: 1.1rem;
}
.hint {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-faded);
  line-height: 1.5;
}
</style>
