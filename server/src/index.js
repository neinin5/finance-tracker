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

app.use((err, req, res, _next) => {
  console.error(err)
  res.status(err.status || 500).json({ error: err.message || 'Server error' })
})

const PORT = process.env.PORT || 3000

await connectDB()
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
  console.log(
    `CORS allowed origins: ${
      allowedOrigins.includes('*') ? 'any' : allowedOrigins.join(', ')
    }`
  )
})
