const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, maxlength: 1000 }
}, { timestamps: true });

reviewSchema.index({ room: 1, user: 1 }, { unique: true });

// Update room aggregate on review save
reviewSchema.statics.recalcRoom = async function (roomId) {
  const stats = await this.aggregate([
    { $match: { room: new mongoose.Types.ObjectId(roomId) } },
    { $group: { _id: '$room', avg: { $avg: '$rating' }, count: { $sum: 1 } } }
  ]);
  const Room = mongoose.model('Room');
  if (stats.length) {
    await Room.findByIdAndUpdate(roomId, { rating: stats[0].avg.toFixed(1), reviewCount: stats[0].count });
  } else {
    await Room.findByIdAndUpdate(roomId, { rating: 0, reviewCount: 0 });
  }
};

reviewSchema.post('save', function () { this.constructor.recalcRoom(this.room); });
reviewSchema.post('deleteOne', { document: true, query: false }, function () { this.constructor.recalcRoom(this.room); });

module.exports = mongoose.model('Review', reviewSchema);
