const Review = require('../models/Review');
const Booking = require('../models/Booking');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');

exports.createReview = asyncHandler(async (req, res) => {
  const { roomId, rating, comment } = req.body;
  // Only allow reviews if user has a completed booking
  const has = await Booking.findOne({ user: req.user._id, room: roomId, paymentStatus: 'paid' });
  if (!has) throw new ApiError(403, 'Only paid guests can review');
  const review = await Review.findOneAndUpdate(
    { room: roomId, user: req.user._id },
    { rating, comment },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
  );
  await Review.recalcRoom(roomId);
  send(res, 201, { review });
});

exports.listReviews = asyncHandler(async (req, res) => {
  const items = await Review.find({ room: req.params.roomId }).populate('user', 'name avatar').sort('-createdAt');
  send(res, 200, { items });
});

exports.deleteReview = asyncHandler(async (req, res) => {
  const r = await Review.findById(req.params.id);
  if (!r) throw new ApiError(404, 'Review not found');
  if (r.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new ApiError(403, 'Not allowed');
  await r.deleteOne();
  send(res, 200, {}, 'Deleted');
});
