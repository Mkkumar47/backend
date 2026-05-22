const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, unique: true, required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  durationType: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
  durationCount: { type: Number, required: true, min: 1 },
  guests: { type: Number, default: 1, min: 1 },
  foodIncluded: { type: Boolean, default: false },
  pricing: {
    baseAmount: Number,
    foodAmount: { type: Number, default: 0 },
    gst: Number,
    totalAmount: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rejected'],
    default: 'pending',
    index: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },
  payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
  source: { type: String, enum: ['online', 'offline'], default: 'online' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  notes: String,
  cancelledAt: Date,
  cancelReason: String
}, { timestamps: true });

bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
