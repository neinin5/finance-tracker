import express from 'express'
import Expense from '../models/Expense.js'
import { authRequired } from '../middleware/auth.js'
import { gbpToThb, toGBP } from '../utils/currency.js'

const router = express.Router()

router.use(authRequired)

router.get('/', async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.userId })
      .sort({ date: -1, createdAt: -1 })
      .lean()
    res.json(expenses)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

router.post('/', async (req, res) => {
  const { date, category, description, note, amountGBP, currency, amountOriginal, location } = req.body || {}

  // Support legacy amountGBP-only payloads as well as new multi-currency ones
  const chosenCurrency = currency || 'GBP'
  const originalAmount = Number(amountOriginal ?? amountGBP)

  if (!date || !category || !originalAmount || originalAmount <= 0) {
    return res.status(400).json({ error: 'Date, category and amount are required' })
  }

  const gbp = toGBP(originalAmount, chosenCurrency)
  const doc = {
    user: req.userId,
    date,
    category,
    description: description || '',
    note: note || '',
    amountGBP: gbp,
    amountTHB: gbpToThb(gbp),
    currency: chosenCurrency,
    amountOriginal: originalAmount,
    source: 'manual'
  }

  if (location && (location.lat != null || location.placeId)) {
    doc.location = {
      name: String(location.name || '').slice(0, 200),
      address: String(location.address || '').slice(0, 300),
      lat: location.lat != null ? Number(location.lat) : null,
      lng: location.lng != null ? Number(location.lng) : null,
      placeId: String(location.placeId || '')
    }
  }

  try {
    const expense = await Expense.create(doc)
    res.status(201).json(expense)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create expense' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const existing = await Expense.findOne({ _id: req.params.id, user: req.userId })
    if (!existing) return res.status(404).json({ error: 'Not found' })

    const { date, category, description, note, currency, amountOriginal, amountGBP, location } = req.body || {}
    const chosenCurrency = currency || existing.currency || 'GBP'
    const originalAmount =
      amountOriginal != null
        ? Number(amountOriginal)
        : amountGBP != null
          ? Number(amountGBP)
          : existing.amountOriginal

    if (!date || !category || !originalAmount || originalAmount <= 0) {
      return res.status(400).json({ error: 'Date, category and amount are required' })
    }

    const gbp = toGBP(originalAmount, chosenCurrency)
    existing.date = date
    existing.category = category
    existing.description = description ?? existing.description
    existing.note = note ?? existing.note
    existing.currency = chosenCurrency
    existing.amountOriginal = originalAmount
    existing.amountGBP = gbp
    existing.amountTHB = gbpToThb(gbp)

    // Location: explicit null → clear; object → set; undefined → keep
    if (location === null) {
      existing.location = undefined
    } else if (location && (location.lat != null || location.placeId)) {
      existing.location = {
        name: String(location.name || '').slice(0, 200),
        address: String(location.address || '').slice(0, 300),
        lat: location.lat != null ? Number(location.lat) : null,
        lng: location.lng != null ? Number(location.lng) : null,
        placeId: String(location.placeId || '')
      }
    }

    await existing.save()
    res.json(existing)
  } catch (err) {
    res.status(500).json({ error: 'Failed to update expense' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const result = await Expense.deleteOne({
      _id: req.params.id,
      user: req.userId
    })
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete expense' })
  }
})

export default router
