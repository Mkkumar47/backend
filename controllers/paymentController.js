const { v4: uuid } = require('uuid');
const Booking = require('../models/Booking');
const Payment = require('../models/Payment');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');
const phonepe = require('../services/phonepeService');
const { sendEmail, templates } = require('../services/emailService');
const { generateReceipt } = require('../services/pdfService');

// POST /api/payments/initiate { bookingId }
exports.initiate = asyncHandler(async (req, res) => {
  const { bookingId } = req.body;
  const booking = await Booking.findById(bookingId).populate('user', 'mobile email name');
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.user._id.toString() !== req.user._id.toString()) throw new ApiError(403, 'Not your booking');
  if (booking.paymentStatus === 'paid') throw new ApiError(400, 'Already paid');

  const merchantTransactionId = 'MT' + Date.now() + uuid().slice(0, 6).toUpperCase();

  const payment = await Payment.create({
    booking: booking._id,
    user: req.user._id,
    merchantTransactionId,
    amount: booking.pricing.totalAmount,
    method: 'UPI',
    status: 'initiated'
  });

  const clientUrl = process.env.CLIENT_URL;
  const apiUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
  const result = await phonepe.initiatePayment({
    merchantTransactionId,
    amount: booking.pricing.totalAmount,
    userId: String(req.user._id),
    redirectUrl: `${clientUrl}/payment/redirect?mtid=${merchantTransactionId}`,
    callbackUrl: `${apiUrl}/api/payments/callback`,
    mobile: booking.user.mobile
  });

  booking.payment = payment._id;
  await booking.save();

  const redirectUrl = result?.data?.instrumentResponse?.redirectInfo?.url;
  if (!redirectUrl) throw new ApiError(500, 'Could not get payment URL');

  send(res, 200, { redirectUrl, merchantTransactionId });
});

// POST /api/payments/callback  (PhonePe → server)
exports.callback = asyncHandler(async (req, res) => {
  const xVerify = req.headers['x-verify'];
  const base64Response = req.body?.response;
  if (!base64Response || !phonepe.verifyCallbackSignature(xVerify, base64Response)) {
    return res.status(400).json({ success: false, message: 'Invalid signature' });
  }
  const decoded = JSON.parse(Buffer.from(base64Response, 'base64').toString());
  const mtid = decoded?.data?.merchantTransactionId;
  const success = decoded?.code === 'PAYMENT_SUCCESS';

  const payment = await Payment.findOne({ merchantTransactionId: mtid });
  if (!payment) return res.status(404).json({ success: false });

  payment.status = success ? 'success' : 'failed';
  payment.rawResponse = decoded;
  payment.phonepeTransactionId = decoded?.data?.transactionId;
  payment.paidAt = success ? new Date() : null;
  await payment.save();

  const booking = await Booking.findById(payment.booking).populate('user').populate('room');
  if (booking) {
    booking.paymentStatus = success ? 'paid' : 'failed';
    booking.status = success ? 'confirmed' : booking.status;
    await booking.save();

    if (success) {
      try {
        const pdf = await generateReceipt(booking, booking.user, booking.room, payment);
        await sendEmail({
          to: booking.user.email,
          subject: 'Payment successful — your receipt',
          html: templates.paymentSuccess(booking.user.name, booking, payment.phonepeTransactionId || mtid),
          attachments: [{ filename: `receipt-${booking.bookingId}.pdf`, content: pdf }]
        });
      } catch (e) { console.warn('Receipt email failed:', e.message); }
    }
  }

  res.status(200).json({ success: true });
});

// GET /api/payments/verify/:mtid  (client polls after redirect)
exports.verify = asyncHandler(async (req, res) => {
  const result = await phonepe.verifyPayment(req.params.mtid);
  const payment = await Payment.findOne({ merchantTransactionId: req.params.mtid });
  if (!payment) throw new ApiError(404, 'Payment not found');

  const success = result?.code === 'PAYMENT_SUCCESS';
  if (success && payment.status !== 'success') {
    payment.status = 'success';
    payment.phonepeTransactionId = result?.data?.transactionId;
    payment.paidAt = new Date();
    payment.rawResponse = result;
    await payment.save();
    const booking = await Booking.findById(payment.booking);
    if (booking) { booking.paymentStatus = 'paid'; booking.status = 'confirmed'; await booking.save(); }
  } else if (!success && payment.status === 'initiated') {
    payment.status = 'failed';
    payment.rawResponse = result;
    await payment.save();
  }

  send(res, 200, { status: payment.status, booking: payment.booking, phonepe: result });
});

// GET /api/payments/receipt/:bookingId — download PDF
exports.downloadReceipt = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId)
    .populate('user').populate('room').populate('payment');
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.user._id.toString() !== req.user._id.toString() && !['admin','reception'].includes(req.user.role))
    throw new ApiError(403, 'Not allowed');

  const pdf = await generateReceipt(booking, booking.user, booking.room, booking.payment);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="receipt-${booking.bookingId}.pdf"`);
  res.send(pdf);
});
