import mongoose from 'mongoose'
import { SUPPORTED_CURRENCIES } from '../utils/currency.js'

const incomeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  date: { type: String, required: true },
  category: { type: String, required: true, default: 'Other' },
  description: { type: String, default: '' },
  note: { type: String, default: '' },
  amountGBP: { type: Number, required: true, min: 0 },
  amountTHB: { type: Number, required: true, min: 0 },
  currency: { type: String, enum: SUPPORTED_CURRENCIES, default: 'GBP' },
  amountOriginal: { type: Number, required: true, min: 0 },
  source: { type: String, enum: ['manual'], default: 'manual' },
  createdAt: { type: Date, default: Date.now }
})

incomeSchema.index({ user: 1, date: -1 })

export default mongoose.model('Income', incomeSchema)
