const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'your_cloud_name',
  api_key:    process.env.CLOUDINARY_API_KEY    || 'your_api_key',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'your_api_secret',
});

// Storage for payment proof images
const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'felicity/payment-proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
  },
});

const uploadPaymentProof = multer({
  storage: paymentProofStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = { cloudinary, uploadPaymentProof };
