const fs = require('fs');
const path = require('path');

const StoredUpload = require('../models/StoredUpload');

const DEFAULT_UPLOAD_MIGRATION_FOLDERS = ['products', 'images', 'editor', 'pdfs'];

const normalizeFolderList = (folders) => {
  if (Array.isArray(folders)) {
    return folders.map((entry) => String(entry || '').trim()).filter(Boolean);
  }

  return String(folders || DEFAULT_UPLOAD_MIGRATION_FOLDERS.join(','))
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const getContentType = (filename) => {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.webp') return 'image/webp';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.pdf') return 'application/pdf';

  return 'application/octet-stream';
};

const collectFiles = async (directory) => {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await collectFiles(fullPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
};

const shouldRunLocalUploadMigration = () => {
  const explicitValue = String(process.env.UPLOAD_MIGRATION_ON_START || '').trim().toLowerCase();

  if (['false', '0', 'no', 'off'].includes(explicitValue)) return false;
  if (['true', '1', 'yes', 'on'].includes(explicitValue)) return true;

  return Boolean(process.env.K_SERVICE) && !process.env.GCS_BUCKET_NAME;
};

const migrateLocalUploadsToDatabase = async ({
  uploadsRoot = path.resolve(__dirname, '../../uploads'),
  folders = process.env.UPLOAD_MIGRATION_FOLDERS,
  logger = console,
} = {}) => {
  const normalizedUploadsRoot = path.normalize(uploadsRoot);
  const includedFolders = new Set(normalizeFolderList(folders));

  if (!fs.existsSync(normalizedUploadsRoot)) {
    logger.info?.(`[UPLOAD_MIGRATION] No uploads folder found at ${normalizedUploadsRoot}.`);
    return {
      migrated: 0,
      failed: 0,
      skipped: 0,
      root: normalizedUploadsRoot,
      folders: Array.from(includedFolders),
    };
  }

  const files = await collectFiles(normalizedUploadsRoot);
  if (files.length === 0) {
    logger.info?.(`[UPLOAD_MIGRATION] Uploads folder is empty at ${normalizedUploadsRoot}.`);
    return {
      migrated: 0,
      failed: 0,
      skipped: 0,
      root: normalizedUploadsRoot,
      folders: Array.from(includedFolders),
    };
  }

  let migrated = 0;
  let failed = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const relativePath = path.relative(normalizedUploadsRoot, filePath);
      const key = relativePath.replace(/\\/g, '/');
      const topLevelFolder = key.split('/')[0];

      if (!includedFolders.has(topLevelFolder)) {
        skipped += 1;
        continue;
      }

      const folder = path.posix.dirname(key) === '.' ? '' : path.posix.dirname(key);
      const filename = path.posix.basename(key);
      const buffer = await fs.promises.readFile(filePath);

      await StoredUpload.findOneAndUpdate(
        { key },
        {
          key,
          folder,
          filename,
          contentType: getContentType(filename),
          size: buffer.length,
          data: buffer,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      migrated += 1;
    } catch (error) {
      failed += 1;
      logger.error?.(`[UPLOAD_MIGRATION] Failed for ${filePath}: ${error.message}`);
    }
  }

  logger.info?.(
    `[UPLOAD_MIGRATION] Finished. Migrated: ${migrated}, Failed: ${failed}, Skipped: ${skipped}, Root: ${normalizedUploadsRoot}, Folders: ${Array.from(includedFolders).join(', ')}`
  );

  return {
    migrated,
    failed,
    skipped,
    root: normalizedUploadsRoot,
    folders: Array.from(includedFolders),
  };
};

module.exports = {
  DEFAULT_UPLOAD_MIGRATION_FOLDERS,
  migrateLocalUploadsToDatabase,
  normalizeFolderList,
  shouldRunLocalUploadMigration,
};
