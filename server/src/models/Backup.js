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

  // Snapshot stats (denormalised for fast list display)
  expenseCount: { type: Number, default: 0 },
  totalGBP: { type: Number, default: 0 },
  totalTHB: { type: Number, default: 0 },
  monthlyLimitGBP: { type: Number, default: null },

  // Full snapshot of expense documents (plain objects)
  expenses: { type: Array, default: [] }
})

backupSchema.index({ user: 1, createdAt: -1 })

export default mongoose.model('Backup', backupSchema)
