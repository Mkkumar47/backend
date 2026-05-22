const Booking = require('../models/Booking');
const Room = require('../models/Room');
const User = require('../models/User');
const Payment = require('../models/Payment');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');

// GET /api/admin/stats
exports.stats = asyncHandler(async (req, res) => {
  const [totalBookings, totalRooms, totalUsers, totalRevenueAgg, occupancyAgg] = await Promise.all([
    Booking.countDocuments(),
    Room.countDocuments({ isActive: true }),
    User.countDocuments({ role: 'customer' }),
    Payment.aggregate([{ $match: { status: 'success' } }, { $group: { _id: null, sum: { $sum: '$amount' } } }]),
    Room.aggregate([{ $group: { _id: null, total: { $sum: '$totalUnits' }, occ: { $sum: '$occupiedUnits' } } }])
  ]);

  const totalRevenue = totalRevenueAgg[0]?.sum || 0;
  const occRow = occupancyAgg[0] || { total: 0, occ: 0 };
  const occupancyRate = occRow.total ? +(occRow.occ / occRow.total * 100).toFixed(1) : 0;

  // Monthly revenue (last 12 months)
  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1);
  const monthlyRevenue = await Payment.aggregate([
    { $match: { status: 'success', paidAt: { $gte: since } } },
    { $group: { _id: { y: { $year: '$paidAt' }, m: { $month: '$paidAt' } }, total: { $sum: '$amount' } } },
    { $sort: { '_id.y': 1, '_id.m': 1 } }
  ]);

  // Booking trends (last 30 days)
  const since30 = new Date(); since30.setDate(since30.getDate() - 29);
  const bookingTrends = await Booking.aggregate([
    { $match: { createdAt: { $gte: since30 } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);

  send(res, 200, { totalBookings, totalRooms, totalUsers, totalRevenue, occupancyRate, monthlyRevenue, bookingTrends });
});

exports.listBookings = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.paymentStatus) filter.paymentStatus = req.query.paymentStatus;
  const [items, total] = await Promise.all([
    Booking.find(filter).populate('user', 'name email mobile').populate('room', 'title hostelName')
      .sort('-createdAt').skip((page-1)*limit).limit(limit),
    Booking.countDocuments(filter)
  ]);
  send(res, 200, { items, total, page, pages: Math.ceil(total/limit) });
});

exports.listUsers = asyncHandler(async (req, res) => {
  const items = await User.find().sort('-createdAt').limit(200);
  send(res, 200, { items });
});

exports.recentActivity = asyncHandler(async (req, res) => {
  const [bookings, payments] = await Promise.all([
    Booking.find().sort('-createdAt').limit(10).populate('user', 'name').populate('room', 'title'),
    Payment.find().sort('-createdAt').limit(10).populate('user', 'name')
  ]);
  send(res, 200, { bookings, payments });
});
