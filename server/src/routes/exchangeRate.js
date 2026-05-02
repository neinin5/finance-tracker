import express from 'express'
import { authRequired } from '../middleware/auth.js'
import { getRateHistory } from '../services/exchangeRateService.js'

const router = express.Router()
router.use(authRequired)

router.get('/', async (req, res, next) => {
  try {
    const days = Math.min(365, Math.max(7, Number(req.query.days) || 30))
    const data = await getRateHistory({ days })
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
