const ApiError = require('../utils/apiError');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Not authenticated'));
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, `Role '${req.user.role}' not authorized`));
  }
  next();
};

module.exports = { authorize };
