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
const {
  isAllowedImageMimeType,
  isAllowedBase64DocumentMimeType,
} = require('../utils/fileValidation');

const PRODUCT_IMAGE_UPLOAD_LIMIT = 10;
const EDITOR_IMAGE_UPLOAD_LIMIT = 5;

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
let cachedWatermarkFontCss = null;

const WATERMARK_FONT_PATH = path.join(__dirname, '../fonts/Cairo-Regular.ttf');

const normalizeUploadKey = (value = '') => (
  String(value || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter((segment) => segment && segment !== '.' && segment !== '..')
    .join('/')
);

const escapeSvgText = (value = '') => (
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
);

const hasRtlCharacters = (value = '') => /[\u0590-\u08FF]/.test(String(value ?? ''));

const getWatermarkFontCss = () => {
  if (cachedWatermarkFontCss !== null) {
    return cachedWatermarkFontCss;
  }

  if (!fs.existsSync(WATERMARK_FONT_PATH)) {
    cachedWatermarkFontCss = '';
    return cachedWatermarkFontCss;
  }

  const fontBase64 = fs.readFileSync(WATERMARK_FONT_PATH).toString('base64');
  cachedWatermarkFontCss = `
    @font-face {
      font-family: 'PayQustaWatermark';
      src: url("data:font/ttf;base64,${fontBase64}") format('truetype');
      font-style: normal;
      font-weight: 400;
    }
  `.trim();

  return cachedWatermarkFontCss;
};

const buildWatermarkSvg = (text, opacityText) => {
  const normalizedText = String(text ?? '').trim();
  if (!normalizedText) return '';

  const escapedText = escapeSvgText(normalizedText);
  const embeddedFontCss = getWatermarkFontCss();
  const fontFamily = embeddedFontCss
    ? "'PayQustaWatermark', 'Cairo', sans-serif"
    : "'Segoe UI', Arial, sans-serif";
  const direction = hasRtlCharacters(normalizedText) ? 'rtl' : 'ltr';
  const fontSize = Math.max(24, Math.min(44, Math.round(520 / Math.max(normalizedText.length, 12))));

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="200" viewBox="0 0 800 200">
      <style>
        ${embeddedFontCss}
        .watermark-text {
          font-family: ${fontFamily};
          font-size: ${fontSize}px;
          font-weight: 700;
          white-space: pre;
          unicode-bidi: plaintext;
        }
        .title { fill: rgba(255, 255, 255, ${opacityText}); }
        .shadow { fill: rgba(0, 0, 0, ${opacityText}); }
      </style>
      <g transform="translate(400 100)">
        <text x="2" y="2" text-anchor="middle" dominant-baseline="middle" direction="${direction}" class="watermark-text shadow">${escapedText}</text>
        <text x="0" y="0" text-anchor="middle" dominant-baseline="middle" direction="${direction}" class="watermark-text title">${escapedText}</text>
      </g>
    </svg>
  `.trim();
};

const getUploadStorageMode = () => {
  const explicitMode = String(process.env.UPLOAD_STORAGE || '').trim().toLowerCase();

  if (explicitMode === 'gcs' || explicitMode === 'google') return 'gcs';
  if (explicitMode === 'mongodb' || explicitMode === 'mongo' || explicitMode === 'db') return 'mongodb';
  if (explicitMode === 'local' || explicitMode === 'filesystem' || explicitMode === 'fs') return 'local';

  if (process.env.GCS_BUCKET_NAME) return 'gcs';
  if (process.env.K_SERVICE) return 'mongodb';

  return 'local';
};

const getStoredUploadModel = () => require('../models/StoredUpload');

const extractUploadKey = (filepath) => {
  if (typeof filepath !== 'string') return null;

  const normalizedPath = filepath.split('?')[0].split('#')[0];
  const uploadsIndex = normalizedPath.indexOf('/uploads/');

  if (uploadsIndex >= 0) {
    return normalizeUploadKey(normalizedPath.slice(uploadsIndex + '/uploads/'.length));
  }

  return null;
};

const getLocalUploadPath = (filepathOrKey) => {
  const uploadKey = filepathOrKey?.startsWith?.('/uploads/')
    ? extractUploadKey(filepathOrKey)
    : normalizeUploadKey(filepathOrKey);

  if (!uploadKey) return null;
  return path.join(__dirname, '../../uploads', uploadKey);
};

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

const saveUploadToDatabase = async ({ key, folder, filename, buffer, contentType }) => {
  const StoredUpload = getStoredUploadModel();

  await StoredUpload.findOneAndUpdate(
    { key },
    {
      key,
      folder,
      filename,
      contentType,
      size: buffer.length,
      data: buffer,
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return `/uploads/${key}`;
};

const readUploadedFile = async (filepath) => {
  const cloudBucket = getCloudBucket();
  const cloudObjectPath = extractCloudObjectPath(filepath);

  if (cloudBucket && cloudObjectPath) {
    const [buffer] = await cloudBucket.file(cloudObjectPath).download();
    return { buffer, contentType: 'application/octet-stream', source: 'gcs' };
  }

  const uploadKey = extractUploadKey(filepath);
  if (!uploadKey) return null;

  const localPath = getLocalUploadPath(uploadKey);
  if (localPath && fs.existsSync(localPath)) {
    const buffer = await fs.promises.readFile(localPath);
    return { buffer, contentType: 'application/octet-stream', source: 'local' };
  }

  const StoredUpload = getStoredUploadModel();
  const storedUpload = await StoredUpload.findOne({ key: uploadKey }).select('data contentType size');
  if (!storedUpload) return null;

  return {
    buffer: storedUpload.data,
    contentType: storedUpload.contentType || 'application/octet-stream',
    size: storedUpload.size,
    source: 'mongodb',
  };
};

const serveUploadedFile = async (req, res, next) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) return next();

    const uploadKey = normalizeUploadKey(req.params[0] || req.path || '');
    if (!uploadKey) return next();

    const StoredUpload = getStoredUploadModel();
    const storedUpload = await StoredUpload.findOne({ key: uploadKey }).select('data contentType size');
    if (!storedUpload) return next();

    res.setHeader('Content-Type', storedUpload.contentType || 'application/octet-stream');
    res.setHeader('Content-Length', String(storedUpload.size || storedUpload.data.length || 0));
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    if (req.method === 'HEAD') {
      return res.status(200).end();
    }

    return res.status(200).end(storedUpload.data);
  } catch (error) {
    console.error('Upload fallback read error:', error);
    return next();
  }
};

// Memory storage (we'll process with Sharp before saving)
const storage = multer.memoryStorage();

// File filter - enhanced security
const fileFilter = (req, file, cb) => {
  if (isAllowedImageMimeType(file.mimetype)) {
    file.originalname = sanitizeFilename(file.originalname);
    cb(null, true);
  } else {
    return cb(AppError.badRequest('Only JPG, PNG, and WebP images are allowed'), false);
  }
};


const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    fieldSize: 10 * 1024 * 1024, // 10MB max form field size (to accommodate Base64 variant images)
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

      const svgWatermark = buildWatermarkSvg(watermarkOptions.text, opacityText);

      if (svgWatermark) {
        imageProcessor = imageProcessor.composite([{
          input: Buffer.from(svgWatermark),
          gravity: gravity,
        }]);
      }
    }

    const processedBuffer = await imageProcessor
      .webp({ quality: 85 })
      .toBuffer();

    const normalizedFolder = normalizeUploadKey(folder);
    const storageMode = getUploadStorageMode();

    if (storageMode === 'gcs') {
      const cloudBucket = getCloudBucket();
      if (!cloudBucket) {
        throw new Error('GCS upload mode selected without GCS bucket configuration');
      }

      const objectPath = `${normalizedFolder}/${secureFilename}`;
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

      return getCloudPublicUrl(normalizedFolder, secureFilename);
    }

    if (storageMode === 'mongodb') {
      const uploadKey = normalizeUploadKey(`${normalizedFolder}/${secureFilename}`);
      return saveUploadToDatabase({
        key: uploadKey,
        folder: normalizedFolder,
        filename: secureFilename,
        buffer: processedBuffer,
        contentType: 'image/webp',
      });
    }

    const uploadDir = path.join(__dirname, '../../uploads', normalizedFolder);
    ensureDirectoryExists(uploadDir);

    const filepath = path.join(uploadDir, secureFilename);
    await fs.promises.writeFile(filepath, processedBuffer);

    return `/uploads/${normalizedFolder}/${secureFilename}`;
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

    const uploadKey = extractUploadKey(filepath);
    if (uploadKey) {
      const fullPath = getLocalUploadPath(uploadKey);
      if (fullPath && fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }

      const StoredUpload = getStoredUploadModel();
      await StoredUpload.deleteOne({ key: uploadKey });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

const processBase64Document = async (base64String, folder = 'documents') => {
  const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid base64 string');
  }

  const contentType = matches[1];

  if (!isAllowedBase64DocumentMimeType(contentType)) {
    throw new Error('Unsupported base64 document type');
  }
  const buffer = Buffer.from(matches[2], 'base64');

  let ext = '.bin';
  if (contentType === 'application/pdf') ext = '.pdf';
  else if (contentType === 'image/jpeg') ext = '.jpg';
  else if (contentType === 'image/png') ext = '.png';
  else if (contentType === 'image/webp') ext = '.webp';
  else if (contentType.startsWith('image/')) ext = '.' + contentType.replace('image/', '');

  const randomName = crypto.randomBytes(16).toString('hex');
  const secureFilename = `${randomName}${ext}`;
  const normalizedFolder = normalizeUploadKey(folder);
  const storageMode = getUploadStorageMode();

  if (storageMode === 'gcs') {
    const cloudBucket = getCloudBucket();
    if (!cloudBucket) throw new Error('GCS upload mode selected without GCS bucket configuration');
    const objectPath = `${normalizedFolder}/${secureFilename}`;
    const cloudFile = cloudBucket.file(objectPath);

    await cloudFile.save(buffer, {
      resumable: false,
      metadata: { contentType, cacheControl: 'public, max-age=31536000, immutable' },
    });

    if (process.env.GCS_MAKE_UPLOADS_PUBLIC === 'true') {
      await cloudFile.makePublic();
    }
    return getCloudPublicUrl(normalizedFolder, secureFilename);
  }

  if (storageMode === 'mongodb') {
    const uploadKey = normalizeUploadKey(`${normalizedFolder}/${secureFilename}`);
    return saveUploadToDatabase({
      key: uploadKey,
      folder: normalizedFolder,
      filename: secureFilename,
      buffer,
      contentType,
    });
  }

  const uploadDir = path.join(__dirname, '../../uploads', normalizedFolder);
  ensureDirectoryExists(uploadDir);
  const filepath = path.join(uploadDir, secureFilename);
  await fs.promises.writeFile(filepath, buffer);
  return `/uploads/${normalizedFolder}/${secureFilename}`;
};

module.exports = {
  upload,
  processImage,
  processBase64Document,
  deleteFile,
  readUploadedFile,
  serveUploadedFile,
  getUploadStorageMode,
  uploadSingle: upload.single('image'),
  uploadMultiple: upload.array('images', PRODUCT_IMAGE_UPLOAD_LIMIT),
  uploadEditorImages: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'images', maxCount: EDITOR_IMAGE_UPLOAD_LIMIT },
  ]),
  PRODUCT_IMAGE_UPLOAD_LIMIT,
  EDITOR_IMAGE_UPLOAD_LIMIT,
};


