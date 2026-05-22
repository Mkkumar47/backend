const router = require('express').Router();
const ctrl = require('../controllers/adminController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect, authorize('admin'));
router.get('/stats', ctrl.stats);
router.get('/bookings', ctrl.listBookings);
router.get('/users', ctrl.listUsers);
router.get('/activity', ctrl.recentActivity);

module.exports = router;
