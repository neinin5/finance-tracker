import mongoose from 'mongoose'
import { SUPPORTED_CURRENCIES } from '../utils/currency.js'

const expenseSchema = new mongoose.Schema({
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
  source: { type: String, enum: ['manual', 'google-sheet'], default: 'manual' },
  externalId: { type: String, default: null },
  location: {
    name: { type: String, default: '' },
    address: { type: String, default: '' },
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    placeId: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now }
})

expenseSchema.index({ user: 1, date: -1 })
expenseSchema.index(
  { user: 1, source: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: 'string' } }
  }
)

export default mongoose.model('Expense', expenseSchema)
