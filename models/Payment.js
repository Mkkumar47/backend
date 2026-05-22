const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  merchantTransactionId: { type: String, unique: true, required: true, index: true },
  phonepeTransactionId: String,
  providerOrderId: String,
  amount: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'INR' },
  method: { type: String, enum: ['UPI', 'CARD', 'NETBANKING', 'WALLET', 'OFFLINE'], default: 'UPI' },
  status: {
    type: String,
    enum: ['initiated', 'pending', 'success', 'failed', 'refunded'],
    default: 'initiated',
    index: true
  },
  rawResponse: { type: mongoose.Schema.Types.Mixed },
  failureReason: String,
  paidAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema);
