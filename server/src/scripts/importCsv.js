import { parse } from 'csv-parse/sync'
import Expense from '../models/Expense.js'
import { gbpToThb, toGBP, SUPPORTED_CURRENCIES } from '../utils/currency.js'

// ── Header matchers ───────────────────────────────────────────────────────
const FIELD_ALIASES = {
  date: ['date', 'วันที่', 'day', 'transaction date', 'when'],
  category: ['category', 'หมวด', 'หมวดหมู่', 'type', 'cat'],
  description: ['description', 'desc', 'item', 'รายการ', 'name', 'merchant', 'detail'],
  amount: ['amount', 'price', 'ราคา', 'cost', 'value', 'total', 'gbp', 'thb'],
  currency: ['currency', 'ccy', 'สกุลเงิน'],
  note: ['note', 'notes', 'memo', 'หมายเหตุ', 'comment']
}

function findColumn(headers, fieldName) {
  const aliases = FIELD_ALIASES[fieldName] || []
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').trim().toLowerCase()
    if (aliases.includes(h)) return i
  }
  return -1
}

function parseDate(raw) {
  if (!raw) return null
  const s = String(raw).trim()
  // ISO: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  // DD/MM/YYYY or DD-MM-YYYY
  const m = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m.map(Number)
    if (y < 100) y += 2000
    if (mo > 12) return null
    if (d > 31) return null
    const date = new Date(Date.UTC(y, mo - 1, d))
    if (isNaN(date.getTime())) return null
    return date.toISOString().slice(0, 10)
  }
  // Fallback: native Date parse
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

function parseAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return NaN
  const cleaned = String(raw).replace(/[^0-9.\-]/g, '')
  if (!cleaned || cleaned === '-' || cleaned === '.') return NaN
  return Number(cleaned)
}

function detectCurrency(raw, amountStr) {
  const s = String(raw || '').trim().toUpperCase()
  if (SUPPORTED_CURRENCIES.includes(s)) return s
  // Check the amount string itself for symbols
  const a = String(amountStr || '')
  if (a.includes('£')) return 'GBP'
  if (a.includes('฿')) return 'THB'
  if (a.includes('€')) return 'EUR'
  if (a.includes('$')) return 'USD'
  return 'GBP'
}

export async function importFromCsv({ userId, csv, defaultCurrency = 'GBP' }) {
  if (!userId) throw new Error('userId is required')
  if (!csv || !csv.trim()) throw new Error('CSV content is empty')

  const rows = parse(csv, {
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  })

  if (rows.length < 2) {
    return { imported: 0, skipped: 0, errors: [], total: 0, headers: [] }
  }

  const headers = rows[0]
  const cols = {
    date: findColumn(headers, 'date'),
    category: findColumn(headers, 'category'),
    description: findColumn(headers, 'description'),
    amount: findColumn(headers, 'amount'),
    currency: findColumn(headers, 'currency'),
    note: findColumn(headers, 'note')
  }

  if (cols.date === -1 || cols.amount === -1) {
    throw new Error(
      `CSV must have at least "date" and "amount" columns. Detected headers: [${headers.join(', ')}]`
    )
  }

  const docs = []
  let skipped = 0
  const errors = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.every((c) => String(c || '').trim() === '')) {
      skipped++
      continue
    }

    const dateRaw = row[cols.date]
    const date = parseDate(dateRaw)
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date "${dateRaw}"` })
      skipped++
      continue
    }

    const amountRaw = row[cols.amount]
    const amountValue = parseAmount(amountRaw)
    if (isNaN(amountValue) || amountValue <= 0) {
      errors.push({ row: i + 1, error: `Invalid amount "${amountRaw}"` })
      skipped++
      continue
    }

    const currency =
      cols.currency >= 0
        ? detectCurrency(row[cols.currency], amountRaw)
        : detectCurrency(defaultCurrency, amountRaw)

    const amountGBP = toGBP(amountValue, currency)
    const category =
      cols.category >= 0 && row[cols.category]
        ? String(row[cols.category]).trim()
        : 'Other'

    docs.push({
      user: userId,
      date,
      category: category || 'Other',
      description:
        cols.description >= 0 ? String(row[cols.description] || '').trim() : '',
      note: cols.note >= 0 ? String(row[cols.note] || '').trim() : '',
      amountGBP,
      amountTHB: gbpToThb(amountGBP),
      currency,
      amountOriginal: amountValue,
      source: 'manual'
    })
  }

  let imported = 0
  if (docs.length) {
    const created = await Expense.insertMany(docs, { ordered: false })
    imported = created.length
  }

  return {
    imported,
    skipped,
    errors: errors.slice(0, 20),
    total: imported,
    headers,
    detectedColumns: cols
  }
}
