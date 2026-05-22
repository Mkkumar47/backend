const ApiError = require('../utils/apiError');

// Validate request body using a Yup schema
const validate = (schema) => async (req, res, next) => {
  try {
    req.body = await schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    next();
  } catch (err) {
    next(new ApiError(400, 'Validation failed', err.errors || [err.message]));
  }
};

module.exports = validate;
