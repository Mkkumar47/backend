const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hostelhub/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1600, height: 1200, crop: 'limit', quality: 'auto' }]
  }
});

const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'hostelhub/videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'webm']
  }
});

const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (/jpeg|jpg|png|webp/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only jpg/jpeg/png/webp allowed'), false);
  }
});

const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    if (/mp4|mov|webm/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only mp4/mov/webm allowed'), false);
  }
});

module.exports = { cloudinary, uploadImage, uploadVideo };
