const Room = require('../models/Room');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');

// GET /api/rooms?city=&category=&ac=&food=&minPrice=&maxPrice=&q=&page=&limit=
exports.listRooms = asyncHandler(async (req, res) => {
  const { city, category, ac, food, minPrice, maxPrice, q, sort } = req.query;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 12);

  const filter = { isActive: true };
  if (city) filter['location.city'] = new RegExp(city, 'i');
  if (category) filter.category = category;
  if (ac !== undefined) filter.ac = ac === 'true';
  if (food !== undefined) filter.foodIncluded = food === 'true';
  if (minPrice || maxPrice) {
    filter['pricing.daily'] = {};
    if (minPrice) filter['pricing.daily'].$gte = Number(minPrice);
    if (maxPrice) filter['pricing.daily'].$lte = Number(maxPrice);
  }
  if (q) filter.$text = { $search: q };

  const sortMap = {
    price_asc: { 'pricing.daily': 1 },
    price_desc: { 'pricing.daily': -1 },
    rating: { rating: -1 },
    newest: { createdAt: -1 }
  };

  const [items, total] = await Promise.all([
    Room.find(filter).sort(sortMap[sort] || { createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Room.countDocuments(filter)
  ]);

  send(res, 200, { items, total, page, pages: Math.ceil(total / limit) });
});

// GET /api/rooms/:id
exports.getRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id).populate('owner', 'name email');
  if (!room) throw new ApiError(404, 'Room not found');
  send(res, 200, { room });
});

// POST /api/rooms  (admin)
exports.createRoom = asyncHandler(async (req, res) => {
  const room = await Room.create({ ...req.body, owner: req.user._id });
  send(res, 201, { room }, 'Room created');
});

// PATCH /api/rooms/:id  (admin)
exports.updateRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (req.user.role !== 'admin' && room.owner.toString() !== req.user._id.toString())
    throw new ApiError(403, 'Not your room');
  Object.assign(room, req.body);
  await room.save();
  send(res, 200, { room }, 'Room updated');
});

// DELETE /api/rooms/:id  (admin)
exports.deleteRoom = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  if (req.user.role !== 'admin' && room.owner.toString() !== req.user._id.toString())
    throw new ApiError(403, 'Not your room');
  room.isActive = false; // soft delete
  await room.save();
  send(res, 200, {}, 'Room deactivated');
});

// POST /api/rooms/:id/wishlist  (toggle)
exports.toggleWishlist = asyncHandler(async (req, res) => {
  const room = await Room.findById(req.params.id);
  if (!room) throw new ApiError(404, 'Room not found');
  const user = req.user;
  const idx = user.wishlist.findIndex(r => r.toString() === req.params.id);
  if (idx >= 0) user.wishlist.splice(idx, 1);
  else user.wishlist.push(req.params.id);
  await user.save({ validateBeforeSave: false });
  send(res, 200, { wishlist: user.wishlist }, idx >= 0 ? 'Removed' : 'Added');
});
