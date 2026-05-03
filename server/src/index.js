import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.js'
import expenseRoutes from './routes/expenses.js'
import importRoutes from './routes/import.js'
import exchangeRateRoutes from './routes/exchangeRate.js'
import exportRoutes from './routes/export.js'
import notificationRoutes from './routes/notifications.js'
import budgetRoutes from './routes/budget.js'
import backupRoutes from './routes/backups.js'

const app = express()

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: allowedOrigins.includes('*')
      ? true
      : (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true)
        else cb(new Error(`Origin ${origin} not allowed by CORS`))
      }
  })
)
app.use(express.json())

app.get('/api/health', (req, res) => res.json({ ok: true }))
app.use('/api/auth', authRoutes)
app.use('/api/expenses', expenseRoutes)
app.use('/api/import', importRoutes)
app.use('/api/exchange-rate', exchangeRateRoutes)
app.use('/api/export', exportRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/budget', budgetRoutes)
app.use('/api/backups', backupRoutes)

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 3000

try {
  // ลองเชื่อมต่อ Database
  await connectDB()

  // ให้ bind กับ 0.0.0.0 ซึ่งสำคัญมากสำหรับการ Deploy บน Render
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`API listening on port ${PORT}`)
    console.log(
      `CORS allowed origins: ${allowedOrigins.includes('*') ? 'any' : allowedOrigins.join(', ')
      }`
    )
  })
} catch (error) {
  // ถ้าพัง มันจะพ่น Error ออกมาตรงนี้ให้เราเห็นใน Log ของ Render
  console.error('🔥 Server Failed to Start:', error)
  process.exit(1)
}
