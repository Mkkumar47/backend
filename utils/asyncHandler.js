// Wrap async route handlers to catch promise rejections
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
module.exports = asyncHandler;
