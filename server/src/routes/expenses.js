import express from 'express'
import Expense from '../models/Expense.js'
import { authRequired } from '../middleware/auth.js'
import { gbpToThb, toGBP } from '../utils/currency.js'

const router = express.Router()

router.use(authRequired)

router.get('/', async (req, res) => {
  const expenses = await Expense.find({ user: req.userId })
    .sort({ date: -1, createdAt: -1 })
    .lean()
  res.json(expenses)
})

router.post('/', async (req, res) => {
  const { date, category, description, note, amountGBP, currency, amountOriginal } = req.body || {}

  // Support legacy amountGBP-only payloads as well as new multi-currency ones
  const chosenCurrency = currency || 'GBP'
  const originalAmount = Number(amountOriginal ?? amountGBP)

  if (!date || !category || !originalAmount || originalAmount <= 0) {
    return res.status(400).json({ error: 'Date, category and amount are required' })
  }

  const gbp = toGBP(originalAmount, chosenCurrency)
  const expense = await Expense.create({
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
  })
  res.status(201).json(expense)
})

router.delete('/:id', async (req, res) => {
  const result = await Expense.deleteOne({
    _id: req.params.id,
    user: req.userId
  })
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: 'Not found' })
  }
  res.json({ ok: true })
})

export default router
