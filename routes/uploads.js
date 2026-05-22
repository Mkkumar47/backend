const router = require('express').Router();
const ctrl = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');
const { uploadImage, uploadVideo } = require('../config/cloudinary');

router.use(protect, authorize('admin'));
router.post('/images', uploadImage.array('files', 10), ctrl.uploadImages);
router.post('/videos', uploadVideo.array('files', 3), ctrl.uploadVideos);
router.delete('/', ctrl.deleteMedia);

module.exports = router;
