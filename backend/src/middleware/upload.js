/**
 * File Upload Middleware - Multer Configuration
 * Handles image uploads with validation and processing
 */

const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const AppError = require('../utils/AppError');

/**
 * Sanitize filename to prevent path traversal attacks
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
};

// Ensure upload directories exist
const ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

let cachedBucket = null;

const getCloudBucket = () => {
  if (!process.env.GCS_BUCKET_NAME) return null;

  if (!cachedBucket) {
    const { Storage } = require('@google-cloud/storage');
    const storageOptions = {};

    if (process.env.GCS_PROJECT_ID) {
      storageOptions.projectId = process.env.GCS_PROJECT_ID;
    }

    const storageClient = new Storage(storageOptions);
    cachedBucket = storageClient.bucket(process.env.GCS_BUCKET_NAME);
  }

  return cachedBucket;
};

const getCloudPublicUrl = (folder, filename) => {
  const baseUrl = process.env.GCS_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (baseUrl) {
    return `${baseUrl}/${folder}/${filename}`;
  }

  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${folder}/${filename}`;
};

const extractCloudObjectPath = (filepath) => {
  if (!filepath || !process.env.GCS_BUCKET_NAME) return null;

  const baseUrl = process.env.GCS_PUBLIC_BASE_URL?.replace(/\/+$/, '');
  if (baseUrl && filepath.startsWith(`${baseUrl}/`)) {
    return filepath.slice(baseUrl.length + 1);
  }

  const gcsPrefix = `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/`;
  if (filepath.startsWith(gcsPrefix)) {
    return filepath.slice(gcsPrefix.length);
  }

  return null;
};

// Memory storage (we'll process with Sharp before saving)
const storage = multer.memoryStorage();

// File filter - enhanced security
const fileFilter = (req, file, cb) => {
  // Check if it's an image
  if (file.mimetype.startsWith('image/')) {
    file.originalname = sanitizeFilename(file.originalname);
    cb(null, true);
  } else {
    return cb(AppError.badRequest('يرجى رفع ملفات صور فقط'), false);
  }
};

// Multer configuration
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

/**
 * Process and save uploaded image
 * @param {Buffer} buffer - Image buffer from multer
 * @param {String} filename - Desired filename
 * @param {String} folder - Upload folder (products, avatars, etc.)
 * @param {String} mimetype - Original file mimetype for validation
 * @param {Object} watermarkOptions - Tenant watermark settings
 * @returns {String} - Saved file path
 */
const processImage = async (buffer, filename, folder = 'products', mimetype = 'image/jpeg', watermarkOptions = null) => {
  // Generate secure random filename
  const randomName = crypto.randomBytes(16).toString('hex');
  const ext = '.webp'; // Always convert to webp for consistency and security
  const secureFilename = `${randomName}${ext}`;

  try {
    let imageProcessor = sharp(buffer)
      .resize({
        width: 1080,
        height: 1080,
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .normalize()
      .sharpen();

    // Apply Watermark if enabled and text exists
    if (watermarkOptions?.enabled && watermarkOptions?.text) {
      const gravityMap = {
        'center': 'center',
        'northwest': 'northwest',
        'northeast': 'northeast',
        'southwest': 'southwest',
        'southeast': 'southeast'
      };

      const gravity = gravityMap[watermarkOptions.position] || 'southeast';
      const opacityText = Math.max(0.1, Math.min(1, (watermarkOptions.opacity || 50) / 100));

      // Create SVG text buffer for watermark
      const svgWatermark = `
        <svg width="800" height="800">
          <style>
            .title { fill: rgba(255, 255, 255, ${opacityText}); font-size: 36px; font-weight: bold; font-family: sans-serif; }
            .shadow { fill: rgba(0, 0, 0, ${opacityText}); font-size: 36px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" class="shadow" dx="2" dy="2">${watermarkOptions.text}</text>
          <text x="50%" y="50%" text-anchor="middle" class="title">${watermarkOptions.text}</text>
        </svg>
      `;

      imageProcessor = imageProcessor.composite([{
        input: Buffer.from(svgWatermark),
        gravity: gravity,
      }]);
    }

    const processedBuffer = await imageProcessor
      .webp({ quality: 85 })
      .toBuffer();

    const cloudBucket = getCloudBucket();
    if (cloudBucket) {
      const objectPath = `${folder}/${secureFilename}`;
      const cloudFile = cloudBucket.file(objectPath);

      await cloudFile.save(processedBuffer, {
        resumable: false,
        metadata: {
          contentType: 'image/webp',
          cacheControl: 'public, max-age=31536000, immutable',
        },
      });

      if (process.env.GCS_MAKE_UPLOADS_PUBLIC === 'true') {
        await cloudFile.makePublic();
      }

      return getCloudPublicUrl(folder, secureFilename);
    }

    const uploadDir = path.join(__dirname, '../../uploads', folder);
    ensureDirectoryExists(uploadDir);

    const filepath = path.join(uploadDir, secureFilename);
    await fs.promises.writeFile(filepath, processedBuffer);

    return `/uploads/${folder}/${secureFilename}`;
  } catch (error) {
    console.error('Image processing error:', error);
    throw AppError.badRequest('فشل معالجة الصورة - الملف قد يكون تالفاً');
  }
};

/**
 * Delete uploaded file
 */
const deleteFile = async (filepath) => {
  try {
    const cloudBucket = getCloudBucket();
    const cloudObjectPath = extractCloudObjectPath(filepath);

    if (cloudBucket && cloudObjectPath) {
      await cloudBucket.file(cloudObjectPath).delete({ ignoreNotFound: true });
      return;
    }

    if (typeof filepath === 'string' && filepath.startsWith('/uploads/')) {
      const fullPath = path.join(__dirname, '../..', filepath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

module.exports = {
  upload,
  processImage,
  deleteFile,
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', 5),
};
