const yup = require('yup');

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

const registerSchema = yup.object({
  name: yup.string().min(3).required(),
  email: yup.string().email().required(),
  mobile: yup.string().matches(/^[6-9]\d{9}$/, 'Invalid mobile').required(),
  password: yup.string().matches(passwordRegex, 'Password must be 8+ chars with uppercase, lowercase, number, special char').required(),
  role: yup.string().oneOf(['customer', 'admin', 'reception']).default('customer')
});

const loginSchema = yup.object({
  email: yup.string().email().required(),
  password: yup.string().required()
});

const bookingSchema = yup.object({
  roomId: yup.string().required(),
  checkIn: yup.date().min(new Date(Date.now() - 86400000), 'Check-in cannot be in past').required(),
  checkOut: yup.date().min(yup.ref('checkIn'), 'Check-out must be after check-in').required(),
  durationType: yup.string().oneOf(['daily', 'weekly', 'monthly']).required(),
  durationCount: yup.number().positive().integer().required(),
  guests: yup.number().positive().integer().default(1),
  foodIncluded: yup.boolean().default(false)
});

const roomSchema = yup.object({
  title: yup.string().required(),
  description: yup.string().required(),
  hostelName: yup.string().required(),
  category: yup.string().oneOf(['1-bed', '2-bed', '3-bed']).required(),
  ac: yup.boolean(),
  foodIncluded: yup.boolean(),
  pricing: yup.object({
    daily: yup.number().positive().required(),
    weekly: yup.number().positive().required(),
    monthly: yup.number().positive().required()
  }).required(),
  totalUnits: yup.number().positive().integer().required(),
  location: yup.object({
    city: yup.string().required()
  })
});

module.exports = { registerSchema, loginSchema, bookingSchema, roomSchema, passwordRegex };
