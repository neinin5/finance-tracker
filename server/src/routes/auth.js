import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
import Expense from '../models/Expense.js'
import Budget from '../models/Budget.js'
import Backup from '../models/Backup.js'
import Income from '../models/Income.js'
import { authRequired, signToken } from '../middleware/auth.js'

const router = express.Router()

function userView(user) {
  return {
    id: user._id,
    username: user.username,
    initialFundTHB: user.initialFundTHB,
    exchangeRate: user.exchangeRate
  }
}

router.get('/status', async (_req, res) => {
  const count = await User.estimatedDocumentCount()
  res.json({ needsSetup: count === 0 })
})

router.post('/setup', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  const count = await User.estimatedDocumentCount()
  if (count > 0) {
    return res.status(400).json({ error: 'Setup is already complete' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.create({ username: username.trim(), passwordHash })
  const token = signToken(user._id.toString())
  res.json({ token, user: userView(user) })
})

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }
  const user = await User.findOne({ username: username.trim() })
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
  const token = signToken(user._id.toString())
  res.json({ token, user: userView(user) })
})

router.get('/me', authRequired, async (req, res) => {
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(userView(user))
})

// Update scholarship fund / exchange rate
router.patch('/settings', authRequired, async (req, res) => {
  const { initialFundTHB, exchangeRate } = req.body || {}
  const update = {}
  if (initialFundTHB != null) {
    const n = Number(initialFundTHB)
    if (!isFinite(n) || n <= 0) {
      return res.status(400).json({ error: 'initialFundTHB must be a positive number' })
    }
    update.initialFundTHB = n
  }
  if (exchangeRate != null) {
    const n = Number(exchangeRate)
    if (!isFinite(n) || n <= 0) {
      return res.status(400).json({ error: 'exchangeRate must be a positive number' })
    }
    update.exchangeRate = n
  }
  if (Object.keys(update).length === 0) {
    return res.status(400).json({ error: 'No valid fields provided' })
  }
  const user = await User.findByIdAndUpdate(req.userId, update, { new: true })
  if (!user) return res.status(404).json({ error: 'User not found' })
  res.json(userView(user))
})

// Change password
router.post('/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters' })
  }
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const ok = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
  user.passwordHash = await bcrypt.hash(newPassword, 10)
  await user.save()
  res.json({ ok: true })
})

// Delete all expenses (danger zone)
router.delete('/expenses', authRequired, async (req, res) => {
  const result = await Expense.deleteMany({ user: req.userId })
  res.json({ deleted: result.deletedCount })
})

// Delete entire account + all data
router.delete('/account', authRequired, async (req, res) => {
  const { password } = req.body || {}
  if (!password) return res.status(400).json({ error: 'Password is required to delete account' })
  const user = await User.findById(req.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(401).json({ error: 'Password is incorrect' })

  await Promise.all([
    Expense.deleteMany({ user: req.userId }),
    Income.deleteMany({ user: req.userId }),
    Budget.deleteMany({ user: req.userId }),
    Backup.deleteMany({ user: req.userId }),
    User.findByIdAndDelete(req.userId)
  ])
  res.json({ deleted: true })
})

export default router
