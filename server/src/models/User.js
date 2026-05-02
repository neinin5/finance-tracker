import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  initialFundTHB: { type: Number, default: 1500000 },
  exchangeRate: { type: Number, default: 45 },
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model('User', userSchema)
