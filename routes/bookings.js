const router = require('express').Router();
const ctrl = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const { bookingSchema } = require('../utils/validators');

router.use(protect);
router.post('/', validate(bookingSchema), ctrl.createBooking);
router.post('/offline', authorize('reception', 'admin'), validate(bookingSchema), ctrl.createOfflineBooking);
router.post('/price', ctrl.computePriceEndpoint);
router.get('/me', ctrl.myBookings);
router.get('/:id', ctrl.getBooking);
router.patch('/:id/cancel', ctrl.cancelBooking);
router.patch('/:id/status', authorize('admin', 'reception'), ctrl.updateStatus);

module.exports = router;
