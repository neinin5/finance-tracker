import 'dotenv/config'
import { parse } from 'csv-parse/sync'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import Expense from '../models/Expense.js'
import { gbpToThb } from '../utils/currency.js'

function parseDate(dmy) {
  if (!dmy) return null
  const parts = String(dmy)
    .trim()
    .split('/')
    .map((s) => Number(s.trim()))
  if (parts.length !== 3 || parts.some((n) => isNaN(n))) return null
  let [d, m, y] = parts
  if (y < 100) y += 2000
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10)
}

function parseAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return NaN
  const cleaned = String(raw).replace(/[^0-9.\-]/g, '')
  return Number(cleaned)
}

export async function importFromGoogleSheet({
  userId,
  url = process.env.GOOGLE_SHEET_CSV_URL
} = {}) {
  if (!url) throw new Error('GOOGLE_SHEET_CSV_URL is not set in .env')
  if (!userId) throw new Error('userId is required')

  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) {
    throw new Error(
      `Failed to fetch sheet (${res.status} ${res.statusText}). ` +
        `Make sure the sheet is publicly readable: Share → Anyone with the link → Viewer.`
    )
  }
  const csv = await res.text()
  const rows = parse(csv, {
    skip_empty_lines: false,
    relax_column_count: true,
    bom: true
  })

  if (!rows.length) {
    return { imported: 0, updated: 0, skipped: 0, errors: [], total: 0 }
  }

  let imported = 0
  let updated = 0
  let skipped = 0
  const errors = []

  // Row 0 is headers. Each subsequent row is one expense if it has a row
  // number in column A and a numeric price in column E.
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const [no, item, category, dateRaw, priceRaw, _currency, note] = row

    const rowNumber = String(no || '').trim()
    if (!rowNumber || !/^\d+$/.test(rowNumber)) {
      skipped++
      continue
    }

    const amountGBP = parseAmount(priceRaw)
    if (isNaN(amountGBP) || amountGBP <= 0) {
      skipped++
      continue
    }

    const date = parseDate(dateRaw)
    if (!date) {
      errors.push({ row: i + 1, error: `Invalid date "${dateRaw}"` })
      skipped++
      continue
    }

    const externalId = `row-${rowNumber}`
    const doc = {
      user: userId,
      date,
      category: (category || 'Other').toString().trim() || 'Other',
      description: (item || '').toString().trim(),
      note: (note || '').toString().trim(),
      amountGBP,
      amountTHB: gbpToThb(amountGBP),
      source: 'google-sheet',
      externalId
    }

    const existing = await Expense.findOne({
      user: userId,
      source: 'google-sheet',
      externalId
    })
    if (existing) {
      await Expense.updateOne({ _id: existing._id }, { $set: doc })
      updated++
    } else {
      await Expense.create(doc)
      imported++
    }
  }

  return { imported, updated, skipped, errors, total: imported + updated }
}

// CLI entry
const isCli =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith('importSheet.js')

if (isCli) {
  ;(async () => {
    await connectDB()
    const user = await User.findOne().sort({ createdAt: 1 })
    if (!user) {
      console.error(
        'No user found in MongoDB. Open the web app, complete the first-run setup, then re-run this script.'
      )
      process.exit(1)
    }
    console.log(`Importing into account: ${user.username} (${user._id})`)
    const result = await importFromGoogleSheet({ userId: user._id })
    console.log('Import result:', result)
    await mongoose.disconnect()
  })().catch((err) => {
    console.error('Import failed:', err.message)
    process.exit(1)
  })
}
