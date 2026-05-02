import express from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/User.js'
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

export default router
