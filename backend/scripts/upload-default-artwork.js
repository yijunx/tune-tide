const { uploadFile, initializeBucket } = require('../src/config/minio');
const fs = require('fs');
const path = require('path');

async function uploadDefaultArtwork() {
  try {
    console.log('Initializing MinIO bucket...');
    await initializeBucket();
    
    // Create a simple default album artwork (base64 encoded minimal image)
    const defaultArtworkBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
    const imageBuffer = Buffer.from(defaultArtworkBase64, 'base64');
    
    console.log('Uploading default album artwork...');
    const fileUrl = await uploadFile(
      imageBuffer,
      'default-album-art.jpg',
      'image/jpeg'
    );
    
    console.log('Default album artwork uploaded successfully!');
    console.log('URL:', fileUrl);
    
  } catch (error) {
    console.error('Error uploading default artwork:', error);
  }
}

uploadDefaultArtwork(); 