import express from 'express'
import { authRequired } from '../middleware/auth.js'
import User from '../models/User.js'
import { sendWeeklySummary, isEmailConfigured } from '../services/emailService.js'

const router = express.Router()

router.get('/status', authRequired, (_req, res) => {
  res.json({ emailConfigured: isEmailConfigured() })
})

router.post('/weekly-summary', authRequired, async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean()
    if (!user) return res.status(404).json({ error: 'User not found' })
    const result = await sendWeeklySummary({
      userId: user._id,
      username: user.username,
      to: req.body?.to
    })
    res.json({
      ok: true,
      recipient: result.recipient,
      messageId: result.id
    })
  } catch (err) {
    next(err)
  }
})

// Cron-friendly endpoint — guarded by a shared secret. Sends to all users.
router.post('/cron/weekly-summary', async (req, res, next) => {
  try {
    const expected = process.env.CRON_SECRET
    if (!expected) {
      return res.status(500).json({ error: 'CRON_SECRET not configured' })
    }
    const provided = req.headers['x-cron-secret']
    if (provided !== expected) {
      return res.status(401).json({ error: 'Invalid cron secret' })
    }

    const users = await User.find().lean()
    const results = []
    for (const user of users) {
      try {
        const r = await sendWeeklySummary({
          userId: user._id,
          username: user.username
        })
        results.push({ user: user.username, ok: true, recipient: r.recipient })
      } catch (err) {
        results.push({ user: user.username, ok: false, error: err.message })
      }
    }
    res.json({ sent: results })
  } catch (err) {
    next(err)
  }
})

export default router
