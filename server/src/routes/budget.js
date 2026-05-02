import express from 'express'
import Budget from '../models/Budget.js'
import Expense from '../models/Expense.js'
import { authRequired } from '../middleware/auth.js'

const router = express.Router()
router.use(authRequired)

// GET /api/budget — return current user's monthly limit + current month spending
router.get('/', async (req, res, next) => {
  try {
    const budget = await Budget.findOne({ user: req.userId }).lean()
    const now = new Date()
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Sum GBP expenses for current month
    const expenses = await Expense.find({
      user: req.userId,
      date: { $gte: monthStr + '-01', $lte: monthStr + '-31' }
    }).lean()
    const spentThisMonthGBP = expenses.reduce((s, e) => s + e.amountGBP, 0)

    res.json({
      monthlyLimitGBP: budget?.monthlyLimitGBP ?? null,
      spentThisMonthGBP,
      currentMonth: monthStr
    })
  } catch (err) {
    next(err)
  }
})

// PUT /api/budget — set or update monthly limit
router.put('/', async (req, res, next) => {
  try {
    const limit = Number(req.body?.monthlyLimitGBP)
    if (!limit || limit <= 0) {
      return res.status(400).json({ error: 'monthlyLimitGBP must be a positive number' })
    }
    const budget = await Budget.findOneAndUpdate(
      { user: req.userId },
      { monthlyLimitGBP: limit },
      { upsert: true, new: true }
    )
    res.json(budget)
  } catch (err) {
    next(err)
  }
})

export default router
