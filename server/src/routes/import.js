import express from 'express'
import { authRequired } from '../middleware/auth.js'
import { importFromGoogleSheet } from '../scripts/importSheet.js'

const router = express.Router()
router.use(authRequired)

router.post('/google-sheet', async (req, res, next) => {
  try {
    const result = await importFromGoogleSheet({ userId: req.userId })
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
