const router = require('express').Router();
const ctrl = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/initiate', protect, ctrl.initiate);
router.post('/callback', ctrl.callback); // PhonePe → server (no auth, signed)
router.get('/verify/:mtid', protect, ctrl.verify);
router.get('/receipt/:bookingId', protect, ctrl.downloadReceipt);

module.exports = router;
