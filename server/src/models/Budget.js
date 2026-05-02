import mongoose from 'mongoose'

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  monthlyLimitGBP: { type: Number, required: true, min: 0 }
})

export default mongoose.model('Budget', budgetSchema)
