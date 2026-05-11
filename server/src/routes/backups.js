import express from 'express'
import Backup from '../models/Backup.js'
import Expense from '../models/Expense.js'
import Income from '../models/Income.js'
import Budget from '../models/Budget.js'
import User from '../models/User.js'
import { authRequired } from '../middleware/auth.js'

const router = express.Router()
router.use(authRequired)

// GET /api/backups — list (without heavy payloads)
router.get('/', async (req, res, next) => {
  try {
    const list = await Backup.find({ user: req.userId })
      .select('-expenses -incomes')
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

    const [expenses, incomes, budget, user] = await Promise.all([
      Expense.find({ user: req.userId }).lean(),
      Income.find({ user: req.userId }).lean(),
      Budget.findOne({ user: req.userId }).lean(),
      User.findById(req.userId).lean()
    ])

    const totalGBP = expenses.reduce((s, e) => s + (e.amountGBP || 0), 0)
    const totalTHB = expenses.reduce((s, e) => s + (e.amountTHB || 0), 0)
    const totalIncomeGBP = incomes.reduce((s, i) => s + (i.amountGBP || 0), 0)
    const totalIncomeTHB = incomes.reduce((s, i) => s + (i.amountTHB || 0), 0)
    const manualExpenseCount = expenses.filter((e) => e.source !== 'google-sheet').length
    const sheetExpenseCount = expenses.filter((e) => e.source === 'google-sheet').length

    const backup = await Backup.create({
      user: req.userId,
      label: label || `Backup ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
      expenseCount: expenses.length,
      manualExpenseCount,
      sheetExpenseCount,
      incomeCount: incomes.length,
      totalGBP,
      totalTHB,
      totalIncomeGBP,
      totalIncomeTHB,
      monthlyLimitGBP: budget?.monthlyLimitGBP ?? null,
      userSettings: {
        initialFundTHB: user?.initialFundTHB ?? null,
        exchangeRate: user?.exchangeRate ?? null
      },
      expenses,
      incomes,
      version: 2
    })

    const { expenses: _x, incomes: _i, ...summary } = backup.toObject()
    res.status(201).json(summary)
  } catch (err) {
    next(err)
  }
})

// GET /api/backups/:id — full backup (for download)
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

// POST /api/backups/:id/restore — replace all data with snapshot
router.post('/:id/restore', async (req, res, next) => {
  try {
    const backup = await Backup.findOne({
      _id: req.params.id,
      user: req.userId
    }).lean()
    if (!backup) return res.status(404).json({ error: 'Backup not found' })

    // Wipe current expenses + incomes, then re-insert from snapshot
    await Promise.all([
      Expense.deleteMany({ user: req.userId }),
      Income.deleteMany({ user: req.userId })
    ])

    const stripIds = (arr) =>
      (arr || []).map((d) => {
        const { _id, __v, ...rest } = d
        return { ...rest, user: req.userId }
      })

    const expenseDocs = stripIds(backup.expenses)
    const incomeDocs = stripIds(backup.incomes)

    const inserts = []
    if (expenseDocs.length) inserts.push(Expense.insertMany(expenseDocs, { ordered: false }))
    if (incomeDocs.length) inserts.push(Income.insertMany(incomeDocs, { ordered: false }))
    await Promise.all(inserts)

    // Restore monthly budget
    if (backup.monthlyLimitGBP != null) {
      await Budget.findOneAndUpdate(
        { user: req.userId },
        { monthlyLimitGBP: backup.monthlyLimitGBP },
        { upsert: true }
      )
    }

    // Restore user settings (initial fund + exchange rate)
    const userUpdate = {}
    if (backup.userSettings?.initialFundTHB != null) {
      userUpdate.initialFundTHB = backup.userSettings.initialFundTHB
    }
    if (backup.userSettings?.exchangeRate != null) {
      userUpdate.exchangeRate = backup.userSettings.exchangeRate
    }
    if (Object.keys(userUpdate).length) {
      await User.findByIdAndUpdate(req.userId, userUpdate)
    }

    res.json({
      restoredExpenses: expenseDocs.length,
      restoredIncomes: incomeDocs.length,
      monthlyLimitGBP: backup.monthlyLimitGBP ?? null,
      userSettings: backup.userSettings || null
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
