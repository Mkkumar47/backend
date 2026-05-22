const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');
const { sendEmail, templates } = require('../services/emailService');

const signToken = (id) => jwt.sign({ id }, process.env.JWT_SECRET, {
  expiresIn: process.env.JWT_EXPIRE || '7d'
});

const sanitize = (u) => ({
  _id: u._id, name: u.name, email: u.email, mobile: u.mobile,
  role: u.role, avatar: u.avatar, isVerified: u.isVerified, wishlist: u.wishlist
});

// POST /api/auth/register
exports.register = asyncHandler(async (req, res) => {
  const { name, email, mobile, password, role } = req.body;
  if (await User.findOne({ email })) throw new ApiError(409, 'Email already registered');

  const user = await User.create({ name, email, mobile, password, role: role || 'customer' });

  // Send verify email (best-effort)
  try {
    const token = user.getEmailVerifyToken();
    await user.save({ validateBeforeSave: false });
    const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await sendEmail({ to: user.email, subject: 'Verify your email', html: templates.verifyEmail(user.name, url) });
    await sendEmail({ to: user.email, subject: 'Welcome to HostelHub', html: templates.welcome(user.name) });
  } catch (e) { console.warn('Email send failed:', e.message); }

  send(res, 201, { user: sanitize(user), token: signToken(user._id) }, 'Registered successfully');
});

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.matchPassword(password))) throw new ApiError(401, 'Invalid credentials');
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  send(res, 200, { user: sanitize(user), token: signToken(user._id) }, 'Login successful');
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  send(res, 200, { user: sanitize(req.user) });
});

// POST /api/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return send(res, 200, {}, 'If account exists, email sent'); // don't leak existence

  const token = user.getResetToken();
  await user.save({ validateBeforeSave: false });
  const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
  try {
    await sendEmail({ to: user.email, subject: 'Reset your password', html: templates.resetPassword(user.name, url) });
  } catch (e) {
    user.passwordResetToken = undefined;
    user.passwordResetExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(500, 'Could not send email');
  }
  send(res, 200, {}, 'Password reset email sent');
});

// POST /api/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ passwordResetToken: hashed, passwordResetExpire: { $gt: Date.now() } });
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  const { password } = req.body;
  if (!password) throw new ApiError(400, 'Password required');
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordResetExpire = undefined;
  await user.save();
  send(res, 200, { token: signToken(user._id) }, 'Password reset');
});

// GET /api/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res) => {
  const hashed = crypto.createHash('sha256').update(req.params.token).digest('hex');
  const user = await User.findOne({ emailVerifyToken: hashed, emailVerifyExpire: { $gt: Date.now() } });
  if (!user) throw new ApiError(400, 'Invalid or expired token');
  user.isVerified = true;
  user.emailVerifyToken = undefined;
  user.emailVerifyExpire = undefined;
  await user.save({ validateBeforeSave: false });
  send(res, 200, {}, 'Email verified');
});

// PATCH /api/auth/profile
exports.updateProfile = asyncHandler(async (req, res) => {
  const { name, mobile, avatar } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (mobile) user.mobile = mobile;
  if (avatar !== undefined) user.avatar = avatar;
  await user.save();
  send(res, 200, { user: sanitize(user) }, 'Profile updated');
});
