import express from 'express'
import { authRequired } from '../middleware/auth.js'
import { buildCsv, buildPdf } from '../services/exportService.js'
import User from '../models/User.js'

const router = express.Router()
router.use(authRequired)

router.get('/csv', async (req, res, next) => {
  try {
    const csv = await buildCsv(req.userId)
    const filename = `expenses-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send('﻿' + csv) // BOM for Excel UTF-8 detection
  } catch (err) {
    next(err)
  }
})

router.get('/pdf', async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).lean()
    const buffer = await buildPdf(req.userId, user?.username)
    const filename = `expenses-${new Date().toISOString().slice(0, 10)}.pdf`
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    next(err)
  }
})

export default router
