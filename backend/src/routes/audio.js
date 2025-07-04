const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadAudioFile, initializeBucket, getAudioUrl, streamAudioFile } = require('../config/minio');
const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit for audio files
  },
  fileFilter: (req, file, cb) => {
    // Accept only audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'), false);
    }
  },
});

// Initialize MinIO bucket on startup
initializeBucket();

// Stream audio file
router.get('/stream/:fileName', async (req, res) => {
  try {
    const { fileName } = req.params;
    await streamAudioFile(fileName, req, res);
  } catch (error) {
    console.error('Error streaming audio:', error);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// Upload audio file
router.post('/upload', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}_${originalName}`;

    // Upload to MinIO
    const fileUrl = await uploadAudioFile(
      req.file.buffer,
      fileName,
      req.file.mimetype
    );

    res.json({
      success: true,
      fileUrl,
      fileName,
      message: 'Audio file uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading audio file:', error);
    res.status(500).json({ error: 'Failed to upload audio file' });
  }
});

// Get default audio URL
router.get('/default-audio', (req, res) => {
  const defaultAudioUrl = getAudioUrl('default-audio.mp3');
  res.json({ defaultAudioUrl });
});

module.exports = router; 