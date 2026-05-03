import express from 'express'
import { authRequired } from '../middleware/auth.js'
import { importFromGoogleSheet } from '../scripts/importSheet.js'
import { importFromCsv } from '../scripts/importCsv.js'

const router = express.Router()
router.use(authRequired)

// Increase JSON body limit for CSV pasting (default 100kb is tiny)
router.use(express.json({ limit: '5mb' }))

router.post('/google-sheet', async (req, res, next) => {
  try {
    const result = await importFromGoogleSheet({ userId: req.userId })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

// CSV import — accepts CSV text in the JSON body
router.post('/csv', async (req, res, next) => {
  try {
    const { csv, defaultCurrency } = req.body || {}
    if (!csv) return res.status(400).json({ error: 'csv body field is required' })
    const result = await importFromCsv({
      userId: req.userId,
      csv,
      defaultCurrency: defaultCurrency || 'GBP'
    })
    res.json(result)
  } catch (err) {
    if (err.message?.includes('CSV must have')) {
      return res.status(400).json({ error: err.message })
    }
    next(err)
  }
})

export default router
