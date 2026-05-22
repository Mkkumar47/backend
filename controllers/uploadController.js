const { cloudinary } = require('../config/cloudinary');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const send = require('../utils/apiResponse');

exports.uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw new ApiError(400, 'No files uploaded');
  const items = req.files.map(f => ({ url: f.path, public_id: f.filename }));
  send(res, 201, { items }, 'Uploaded');
});

exports.uploadVideos = asyncHandler(async (req, res) => {
  if (!req.files || !req.files.length) throw new ApiError(400, 'No files uploaded');
  const items = req.files.map(f => ({ url: f.path, public_id: f.filename }));
  send(res, 201, { items }, 'Uploaded');
});

exports.deleteMedia = asyncHandler(async (req, res) => {
  const { public_id, resource_type } = req.body;
  if (!public_id) throw new ApiError(400, 'public_id required');
  await cloudinary.uploader.destroy(public_id, { resource_type: resource_type || 'image' });
  send(res, 200, {}, 'Deleted');
});
