import express from 'express'
import Backup from '../models/Backup.js'
import Expense from '../models/Expense.js'
import Budget from '../models/Budget.js'
import { authRequired } from '../middleware/auth.js'

const router = express.Router()
router.use(authRequired)

// GET /api/backups — list (without expense payloads)
router.get('/', async (req, res, next) => {
  try {
    const list = await Backup.find({ user: req.userId })
      .select('-expenses')
      .sort({ createdAt: -1 })
      .lean()
    res.json(list)
  } catch (err) {
    next(err)
  }
})

// POST /api/backups — create snapshot of all current data
router.post('/', async (req, res, next) => {
  try {
    const label = (req.body?.label || '').toString().trim().slice(0, 100)
    const expenses = await Expense.find({ user: req.userId }).lean()
    const budget = await Budget.findOne({ user: req.userId }).lean()

    const totalGBP = expenses.reduce((s, e) => s + (e.amountGBP || 0), 0)
    const totalTHB = expenses.reduce((s, e) => s + (e.amountTHB || 0), 0)

    const backup = await Backup.create({
      user: req.userId,
      label: label || `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      expenseCount: expenses.length,
      totalGBP,
      totalTHB,
      monthlyLimitGBP: budget?.monthlyLimitGBP ?? null,
      expenses
    })

    const { expenses: _omit, ...summary } = backup.toObject()
    res.status(201).json(summary)
  } catch (err) {
    next(err)
  }
})

// GET /api/backups/:id — full backup including expense payload (for download)
router.get('/:id', async (req, res, next) => {
  try {
    const backup = await Backup.findOne({
      _id: req.params.id,
      user: req.userId
    }).lean()
    if (!backup) return res.status(404).json({ error: 'Backup not found' })
    res.json(backup)
  } catch (err) {
    next(err)
  }
})

// POST /api/backups/:id/restore — replace all expenses with snapshot
router.post('/:id/restore', async (req, res, next) => {
  try {
    const backup = await Backup.findOne({
      _id: req.params.id,
      user: req.userId
    }).lean()
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    // Wipe current expenses, then re-insert from snapshot
    await Expense.deleteMany({ user: req.userId })

    const docs = (backup.expenses || []).map((e) => {
      const { _id, __v, ...rest } = e
      return { ...rest, user: req.userId }
    })
    if (docs.length) await Expense.insertMany(docs, { ordered: false })

    // Restore monthly budget if present
    if (backup.monthlyLimitGBP != null) {
      await Budget.findOneAndUpdate(
        { user: req.userId },
        { monthlyLimitGBP: backup.monthlyLimitGBP },
        { upsert: true }
      )
    }

    res.json({
      restored: docs.length,
      monthlyLimitGBP: backup.monthlyLimitGBP ?? null
    })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/backups/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await Backup.findOneAndDelete({
      _id: req.params.id,
      user: req.userId
    })
    if (!result) return res.status(404).json({ error: 'Backup not found' })
    res.json({ deleted: true })
  } catch (err) {
    next(err)
  }
})

export default router
