const express = require('express');
const multer = require('multer');
const { uploadFile, initializeBucket, getFileUrl } = require('../config/minio');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

// Initialize MinIO bucket on startup
initializeBucket();

// Upload album artwork
router.post('/album-artwork', upload.single('artwork'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${originalName}`;

    // Upload to MinIO
    const fileUrl = await uploadFile(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    res.json({
      success: true,
      fileUrl,
      fileName,
      message: 'Album artwork uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading album artwork:', error);
    res.status(500).json({ error: 'Failed to upload album artwork' });
  }
});

// Get default album artwork URL
router.get('/default-album-art', (req, res) => {
  const defaultArtUrl = getFileUrl('default-album-art.jpg');
  res.json({ defaultArtUrl });
});

module.exports = router; 