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
      
      // Set bucket policy to allow public read access for images
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
async function uploadFile(fileBuffer, fileName, contentType) {
  try {
    const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
    const objectName = `album-artwork/${fileName}`;
    
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

// Get file URL for frontend access (always use localhost)
function getFileUrl(fileName) {
  const bucketName = process.env.MINIO_BUCKET || 'tunetide-assets';
  const objectName = `album-artwork/${fileName}`;
  return `http://localhost:${process.env.MINIO_PORT || 9000}/${bucketName}/${objectName}`;
}

module.exports = {
  minioClient,
  initializeBucket,
  uploadFile,
  getFileUrl
}; 