<script setup>
import { ref, computed } from 'vue'
import { useExpensesStore } from '../stores/expenses'
import { useToastStore } from '../stores/toast'
import { SUPPORTED_CURRENCIES } from '../composables/useCurrency'

const store = useExpensesStore()
const toast = useToastStore()

// ── Google Sheet ────────────────────────────────────────────
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
  if (!confirm(
    'Import expenses from your Google Sheet?\n\n' +
    'Existing imported rows will be updated; manually-added expenses are untouched.'
  )) return
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

// ── CSV Upload ──────────────────────────────────────────────
const csvFile = ref(null)
const csvFileName = ref('')
const csvText = ref('')
const csvCurrency = ref('GBP')
const csvImporting = ref(false)
const csvResult = ref(null)
const csvError = ref('')
const dragOver = ref(false)

const csvPreview = computed(() => {
  if (!csvText.value) return null
  const lines = csvText.value.split(/\r?\n/).filter((l) => l.trim()).slice(0, 4)
  return lines.map((l) => l.split(',').slice(0, 6))
})

function readFile(file) {
  if (!file) return
  if (!file.name.match(/\.csv$/i) && file.type !== 'text/csv') {
    toast.error('Please select a .csv file')
    return
  }
  csvFile.value = file
  csvFileName.value = file.name
  csvResult.value = null
  csvError.value = ''
  const reader = new FileReader()
  reader.onload = (e) => { csvText.value = e.target.result }
  reader.onerror = () => toast.error('Could not read file')
  reader.readAsText(file)
}

function onFileChange(e) {
  readFile(e.target.files[0])
  e.target.value = '' // reset so same file can be re-selected
}

function onDrop(e) {
  e.preventDefault()
  dragOver.value = false
  readFile(e.dataTransfer.files[0])
}

function clearCsv() {
  csvFile.value = null
  csvFileName.value = ''
  csvText.value = ''
  csvResult.value = null
  csvError.value = ''
}

async function handleCsvImport() {
  if (!csvText.value) return toast.error('Choose a CSV file first')
  if (!confirm(
    `Import expenses from ${csvFileName.value || 'CSV'}?\n\n` +
    `New records will be added to your manual expenses.`
  )) return
  csvImporting.value = true
  csvError.value = ''
  csvResult.value = null
  try {
    csvResult.value = await store.importCsv(csvText.value, csvCurrency.value)
    toast.success(
      `Imported ${csvResult.value.imported} record${csvResult.value.imported === 1 ? '' : 's'}` +
      (csvResult.value.skipped ? `, skipped ${csvResult.value.skipped}` : '')
    )
  } catch (err) {
    csvError.value = err.message || 'CSV import failed'
    toast.error(csvError.value)
  } finally {
    csvImporting.value = false
  }
}
</script>

<template>
  <div>
    <header class="page-head">
      <h1>Import Data</h1>
      <p>Pull expenses from a Google Sheet or upload a CSV file.</p>
    </header>

    <div class="grid">
      <!-- ── CSV Upload ────────────────────────────────────── -->
      <div class="card">
        <h3>Upload CSV File</h3>
        <p class="desc">
          Upload a .csv with at least <strong>date</strong> and <strong>amount</strong>
          columns. Optional: category, description, currency, note.
          Date formats supported: YYYY-MM-DD, DD/MM/YYYY.
        </p>

        <div
          class="dropzone"
          :class="{ over: dragOver, has: csvFile }"
          @dragover.prevent="dragOver = true"
          @dragleave.prevent="dragOver = false"
          @drop="onDrop"
        >
          <input
            id="csv-file"
            type="file"
            accept=".csv,text/csv"
            class="file-input"
            @change="onFileChange"
          />
          <label for="csv-file" class="file-label">
            <span v-if="!csvFile" class="dz-icon">↑</span>
            <span v-if="!csvFile" class="dz-text">
              <strong>Click to choose</strong> or drop a CSV here
            </span>
            <span v-else class="dz-file">
              <strong>{{ csvFileName }}</strong>
              <span class="dz-size">{{ Math.round((csvFile.size || 0) / 1024) }} KB</span>
            </span>
          </label>
        </div>

        <!-- Preview -->
        <div v-if="csvPreview" class="preview">
          <p class="prev-label">Preview (first 4 rows)</p>
          <table>
            <tr v-for="(row, i) in csvPreview" :key="i" :class="{ header: i === 0 }">
              <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
            </tr>
          </table>
        </div>

        <!-- Actions -->
        <div v-if="csvFile" class="csv-actions">
          <label class="ccy">
            Default currency
            <select v-model="csvCurrency">
              <option v-for="c in SUPPORTED_CURRENCIES" :key="c" :value="c">{{ c }}</option>
            </select>
          </label>
          <button class="ghost" @click="clearCsv">Clear</button>
          <button class="primary" :disabled="csvImporting" @click="handleCsvImport">
            {{ csvImporting ? 'Importing…' : 'Import CSV' }}
          </button>
        </div>

        <!-- Result -->
        <div v-if="csvResult" class="result success">
          <p><strong>Imported {{ csvResult.imported }}</strong>, skipped {{ csvResult.skipped }}.</p>
          <ul v-if="csvResult.errors?.length" class="errors">
            <li v-for="(e, i) in csvResult.errors" :key="i">Row {{ e.row }}: {{ e.error }}</li>
          </ul>
        </div>
        <div v-if="csvError" class="result error">{{ csvError }}</div>
      </div>

      <!-- ── Google Sheet ─────────────────────────────────── -->
      <div class="card">
        <h3>From Google Sheet</h3>
        <p class="desc">
          Fetches the configured sheet, parses each row, converts GBP to THB
          at the fixed rate, and upserts. Idempotent — re-running updates rows.
        </p>
        <button class="primary" :disabled="importing" @click="handleImport">
          {{ importing ? 'Importing…' : 'Import from Sheet' }}
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
        <div v-if="error" class="result error">{{ error }}</div>
      </div>

      <!-- ── Stats ────────────────────────────────────────── -->
      <div class="card">
        <h3>Current Data</h3>
        <dl class="stats">
          <div><dt>Total records</dt><dd>{{ store.expenses.length }}</dd></div>
          <div><dt>From Google Sheet</dt><dd>{{ sheetCount }}</dd></div>
          <div><dt>Manually added</dt><dd>{{ manualCount }}</dd></div>
        </dl>
        <p class="hint">
          Tip: Export from any banking app or spreadsheet as CSV, then upload here.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-head { margin-bottom: 1.5rem; }
.page-head h1 { margin: 0 0 0.25rem; font-size: 1.5rem; color: var(--color-text); }
.page-head p { margin: 0; color: var(--color-text-muted); font-size: 0.9rem; }
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
.card h3 { margin: 0 0 0.5rem; color: var(--color-text); font-size: 1.1rem; }
.desc {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.5;
  margin: 0 0 1rem;
}

/* ── Dropzone ───────────────────────────────────────────── */
.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: 10px;
  background: var(--color-bg);
  padding: 1.5rem 1rem;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  position: relative;
}
.dropzone.over {
  border-color: var(--color-accent);
  background: var(--color-info-bg);
}
.dropzone.has { border-style: solid; border-color: var(--color-accent); }
.file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.file-input::-webkit-file-upload-button { cursor: pointer; }
.file-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  pointer-events: none;
}
.dz-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-accent);
}
.dz-text { font-size: 0.85rem; color: var(--color-text-muted); }
.dz-text strong { color: var(--color-text); }
.dz-file {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  align-items: center;
}
.dz-file strong { color: var(--color-accent); font-size: 0.95rem; }
.dz-size { font-size: 0.75rem; color: var(--color-text-faded); }

/* ── Preview ────────────────────────────────────────────── */
.preview {
  margin-top: 0.85rem;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem;
  overflow-x: auto;
}
.prev-label {
  margin: 0 0 0.5rem;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}
.preview table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}
.preview td {
  padding: 0.3rem 0.5rem;
  border-bottom: 1px solid var(--color-border-light);
  white-space: nowrap;
  color: var(--color-text);
}
.preview tr:last-child td { border-bottom: none; }
.preview tr.header td {
  font-weight: 700;
  background: var(--color-surface);
  color: var(--color-text-muted);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.04em;
}

/* ── Actions ────────────────────────────────────────────── */
.csv-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.85rem;
  flex-wrap: wrap;
}
.ccy {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
.ccy select {
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.85rem;
}

button {
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
button:disabled { opacity: 0.6; cursor: not-allowed; }
button.primary {
  background: linear-gradient(135deg, #00bb77, #008855);
  color: white;
  border-color: transparent;
  margin-left: auto;
}
button.primary:hover:not(:disabled) { filter: brightness(1.1); }
button.ghost { color: var(--color-text-muted); }
button.ghost:hover { color: var(--color-text); }

.result {
  margin-top: 0.85rem;
  padding: 0.7rem 0.9rem;
  border-radius: 8px;
  font-size: 0.85rem;
}
.result p { margin: 0; }
.result.success { background: var(--color-success-bg); color: var(--color-success-text); }
.result.error { background: var(--color-error-bg); color: var(--color-error-text); }
.errors {
  margin: 0.4rem 0 0;
  padding-left: 1.1rem;
  font-size: 0.78rem;
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
.stats > div:last-child { border-bottom: none; }
.stats dt { color: var(--color-text-muted); font-size: 0.85rem; margin: 0; }
.stats dd { margin: 0; font-weight: 700; color: var(--color-text); font-size: 1.1rem; }
.hint {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  color: var(--color-text-faded);
  line-height: 1.5;
}
</style>
