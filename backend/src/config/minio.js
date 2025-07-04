const Minio = require('minio');
require('dotenv').config();

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'tune-tide-minio',
  port: parseInt(process.env.MINIO_PORT) || 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY || 'minio_access_key',
  secretKey: process.env.MINIO_SECRET_KEY || 'minio_secret_key'
});

// Initialize bucket if it doesn't exist
async function initializeBucket() {
  try {
    const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
    const bucketExists = await minioClient.bucketExists(bucketName);
    
    if (!bucketExists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      console.log(`Bucket '${bucketName}' created successfully`);
      
      // Set bucket policy to allow public read access for images and audio
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`]
          }
        ]
      };
      
      await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      console.log(`Public read access enabled for bucket '${bucketName}'`);
    } else {
      console.log(`Bucket '${bucketName}' already exists`);
    }
  } catch (error) {
    console.error('Error initializing MinIO bucket:', error);
  }
}

// Upload file to MinIO
async function uploadFile(fileBuffer, fileName, contentType, folder = 'album-artwork') {
  try {
    const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
    const objectName = `${folder}/${fileName}`;
    
    await minioClient.putObject(bucketName, objectName, fileBuffer, {
      'Content-Type': contentType
    });
    
    // For frontend access, use localhost (external access)
    // For backend internal access, use Docker hostname
    const fileUrl = `http://localhost:${process.env.MINIO_PORT || 9000}/${bucketName}/${objectName}`;
    return fileUrl;
  } catch (error) {
    console.error('Error uploading file to MinIO:', error);
    throw error;
  }
}

// Upload audio file specifically
async function uploadAudioFile(fileBuffer, fileName, contentType) {
  return uploadFile(fileBuffer, fileName, contentType, 'audio');
}

// Get file URL for frontend access (always use localhost)
function getFileUrl(fileName, folder = 'album-artwork') {
  const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
  const objectName = `${folder}/${fileName}`;
  return `http://localhost:${process.env.MINIO_PORT || 9000}/${bucketName}/${objectName}`;
}

// Get audio file URL for frontend access
function getAudioUrl(fileName) {
  return getFileUrl(fileName, 'audio');
}

// Stream audio file from MinIO
async function streamAudioFile(fileName, req, res) {
  try {
    const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
    const objectName = `audio/${fileName}`;
    
    // Get object info to set proper headers
    const stat = await minioClient.statObject(bucketName, objectName);
    
    // Set headers for audio streaming
    res.setHeader('Content-Type', stat.metaData['content-type'] || 'audio/mpeg');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Accept-Ranges', 'bytes');
    
    // Get the range header for partial content requests
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      res.setHeader('Content-Length', chunksize);
      
      // Stream the requested range
      const stream = await minioClient.getPartialObject(bucketName, objectName, start, end);
      stream.pipe(res);
    } else {
      // Stream the entire file
      const stream = await minioClient.getObject(bucketName, objectName);
      stream.pipe(res);
    }
  } catch (error) {
    console.error('Error streaming audio file:', error);
    res.status(404).json({ error: 'Audio file not found' });
  }
}

module.exports = {
  minioClient,
  initializeBucket,
  uploadFile,
  uploadAudioFile,
  getFileUrl,
  getAudioUrl,
  streamAudioFile
}; 