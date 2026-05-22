const mongoose = require('mongoose');
const { v4: uuid } = require('uuid');
const Booking = require('../models/Booking');
const Room = require('../models/Room');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');
const { sendEmail, templates } = require('../services/emailService');

const GST_RATE = 0.12;
const FOOD_DAILY_INR = 200;

// Compute price server-side (never trust client)
const computePrice = (room, durationType, durationCount, foodIncluded) => {
  const unitPrice = room.pricing[durationType];
  const baseAmount = unitPrice * durationCount;

  // food cost in days
  const days = durationType === 'daily' ? durationCount
             : durationType === 'weekly' ? durationCount * 7
             : durationCount * 30;
  const foodAmount = foodIncluded ? FOOD_DAILY_INR * days : 0;
  const subtotal = baseAmount + foodAmount;
  const gst = +(subtotal * GST_RATE).toFixed(2);
  const totalAmount = +(subtotal + gst).toFixed(2);
  return { baseAmount, foodAmount, gst, totalAmount };
};

// POST /api/bookings
exports.createBooking = asyncHandler(async (req, res) => {
  const { roomId, checkIn, checkOut, durationType, durationCount, guests, foodIncluded } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const room = await Room.findById(roomId).session(session);
    if (!room || !room.isActive) throw new ApiError(404, 'Room not found');
    if (room.occupiedUnits >= room.totalUnits) throw new ApiError(409, 'Room is fully booked');

    // Validate dates
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    if (co <= ci) throw new ApiError(400, 'Check-out must be after check-in');

    const pricing = computePrice(room, durationType, durationCount, foodIncluded);

    // Increment occupancy
    room.occupiedUnits += 1;
    await room.save({ session });

    const [booking] = await Booking.create([{
      bookingId: 'HH-' + Date.now().toString(36).toUpperCase() + '-' + uuid().slice(0, 4).toUpperCase(),
      user: req.user._id,
      room: room._id,
      checkIn: ci,
      checkOut: co,
      durationType,
      durationCount,
      guests,
      foodIncluded,
      pricing,
      status: 'pending',
      paymentStatus: 'pending',
      source: 'online',
      createdBy: req.user._id
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // Notify admin (best-effort)
    sendEmail({
      to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
      subject: `New booking ${booking.bookingId}`,
      html: templates.adminBookingAlert(booking)
    }).catch(() => {});

    send(res, 201, { booking }, 'Booking created');
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
});

// GET /api/bookings (user) — own bookings
exports.myBookings = asyncHandler(async (req, res) => {
  const items = await Booking.find({ user: req.user._id })
    .populate('room', 'title hostelName images location category')
    .sort('-createdAt');
  send(res, 200, { items });
});

// GET /api/bookings/:id
exports.getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id)
    .populate('room')
    .populate('user', 'name email mobile')
    .populate('payment');
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (req.user.role === 'customer' && booking.user._id.toString() !== req.user._id.toString())
    throw new ApiError(403, 'Not your booking');
  send(res, 200, { booking });
});

// PATCH /api/bookings/:id/cancel
exports.cancelBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin')
    throw new ApiError(403, 'Not allowed');
  if (booking.status === 'cancelled') throw new ApiError(400, 'Already cancelled');

  booking.status = 'cancelled';
  booking.cancelledAt = new Date();
  booking.cancelReason = req.body.reason;
  await booking.save();

  // Free a unit
  const room = await Room.findById(booking.room);
  if (room) { room.occupiedUnits = Math.max(0, room.occupiedUnits - 1); await room.save(); }

  send(res, 200, { booking }, 'Booking cancelled');
});

// PATCH /api/bookings/:id/status  (admin)
exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['pending','confirmed','rejected','completed','cancelled'].includes(status))
    throw new ApiError(400, 'Invalid status');
  const booking = await Booking.findById(req.params.id).populate('user', 'name email');
  if (!booking) throw new ApiError(404, 'Booking not found');
  booking.status = status;
  await booking.save();
  if (status === 'confirmed') {
    sendEmail({ to: booking.user.email, subject: 'Booking confirmed',
      html: templates.bookingConfirmed(booking.user.name, booking) }).catch(()=>{});
  }
  send(res, 200, { booking });
});

// Reception: offline booking
exports.createOfflineBooking = asyncHandler(async (req, res) => {
  if (!['reception','admin'].includes(req.user.role)) throw new ApiError(403, 'Not allowed');
  req.body.source = 'offline';
  // Reuse createBooking logic minus payment intent
  return exports.createBooking(req, res);
});

exports.computePriceEndpoint = asyncHandler(async (req, res) => {
  const { roomId, durationType, durationCount, foodIncluded } = req.body;
  const room = await Room.findById(roomId);
  if (!room) throw new ApiError(404, 'Room not found');
  send(res, 200, { pricing: computePrice(room, durationType, durationCount, !!foodIncluded) });
});
