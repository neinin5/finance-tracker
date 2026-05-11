import mongoose from 'mongoose'

const backupSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  label: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },

  // ── Snapshot stats (denormalised for fast list display) ─────
  expenseCount: { type: Number, default: 0 },
  manualExpenseCount: { type: Number, default: 0 },
  sheetExpenseCount: { type: Number, default: 0 },
  incomeCount: { type: Number, default: 0 },
  totalGBP: { type: Number, default: 0 }, // total expenses in GBP
  totalTHB: { type: Number, default: 0 },
  totalIncomeGBP: { type: Number, default: 0 },
  totalIncomeTHB: { type: Number, default: 0 },
  monthlyLimitGBP: { type: Number, default: null },

  // ── User settings at time of backup ─────────────────────────
  userSettings: {
    initialFundTHB: { type: Number, default: null },
    exchangeRate: { type: Number, default: null }
  },

  // ── Full snapshots of documents (plain objects) ─────────────
  expenses: { type: Array, default: [] },
  incomes: { type: Array, default: [] },

  // Schema version for future migrations
  version: { type: Number, default: 2 }
})

backupSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model('Backup', backupSchema)
