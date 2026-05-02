import mongoose from 'mongoose'

const exchangeRateSchema = new mongoose.Schema({
  date: { type: String, required: true, unique: true },
  gbpToThb: { type: Number, required: true },
  source: { type: String, default: 'frankfurter.app' },
  fetchedAt: { type: Date, default: Date.now }
})

exchangeRateSchema.index({ date: -1 })

export default mongoose.model('ExchangeRate', exchangeRateSchema)
