const fs = require('fs');
const path = require('path');
const { uploadAudioFile, initializeBucket } = require('../src/config/minio');

async function uploadDefaultAudio() {
  try {
    console.log('🎵 Uploading default audio file to MinIO...');
    
    // Initialize MinIO bucket
    await initializeBucket();
    
    // Read the mock audio file
    const audioPath = path.join(__dirname, '../mock-audio.mp3');
    
    if (!fs.existsSync(audioPath)) {
      console.error('❌ Mock audio file not found at:', audioPath);
      process.exit(1);
    }
    
    const audioBuffer = fs.readFileSync(audioPath);
    
    // Upload to MinIO
    const fileUrl = await uploadAudioFile(
      audioBuffer,
      'default-audio.mp3',
      'audio/mpeg'
    );
    
    console.log('✅ Default audio uploaded successfully!');
    console.log('📁 File URL:', fileUrl);
    console.log('🎵 You can now use this URL for song audio_url fields');
    
  } catch (error) {
    console.error('❌ Error uploading default audio:', error);
    process.exit(1);
  }
}

// Run the upload
uploadDefaultAudio(); 