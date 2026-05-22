const router = require('express').Router();
const ctrl = require('../controllers/roomController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const validate = require('../middleware/validate');
const { roomSchema } = require('../utils/validators');

router.get('/', ctrl.listRooms);
router.get('/:id', ctrl.getRoom);
router.post('/', protect, authorize('admin'), validate(roomSchema), ctrl.createRoom);
router.patch('/:id', protect, authorize('admin'), ctrl.updateRoom);
router.delete('/:id', protect, authorize('admin'), ctrl.deleteRoom);
router.post('/:id/wishlist', protect, ctrl.toggleWishlist);

module.exports = router;
