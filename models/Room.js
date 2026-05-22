const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  hostelName: { type: String, required: true },
  location: {
    address: String,
    city: { type: String, required: true, index: true },
    state: String,
    pincode: String,
    coordinates: { lat: Number, lng: Number }
  },
  category: {
    type: String,
    enum: ['1-bed', '2-bed', '3-bed'],
    required: true,
    index: true
  },
  ac: { type: Boolean, default: false, index: true },
  foodIncluded: { type: Boolean, default: false },
  pricing: {
    daily: { type: Number, required: true, min: 0 },
    weekly: { type: Number, required: true, min: 0 },
    monthly: { type: Number, required: true, min: 0 }
  },
  totalUnits: { type: Number, required: true, min: 1 },
  occupiedUnits: { type: Number, default: 0, min: 0 },
  amenities: [{ type: String }],
  images: [{ url: String, public_id: String }],
  videos: [{ url: String, public_id: String }],
  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewCount: { type: Number, default: 0 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

roomSchema.virtual('availableUnits').get(function () {
  return Math.max(0, this.totalUnits - this.occupiedUnits);
});

roomSchema.virtual('isAvailable').get(function () {
  return this.totalUnits > this.occupiedUnits && this.isActive;
});

roomSchema.set('toJSON', { virtuals: true });
roomSchema.set('toObject', { virtuals: true });

roomSchema.index({ title: 'text', description: 'text', hostelName: 'text' });

module.exports = mongoose.model('Room', roomSchema);
