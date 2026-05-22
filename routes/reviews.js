const router = require('express').Router();
const ctrl = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');

router.get('/room/:roomId', ctrl.listReviews);
router.post('/', protect, ctrl.createReview);
router.delete('/:id', protect, ctrl.deleteReview);

module.exports = router;
