const path = require('path');

const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const BASE64_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const IMPORT_FILE_EXTENSIONS = new Set(['.xlsx', '.xls', '.csv']);
const IMPORT_FILE_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const JSON_FILE_EXTENSIONS = new Set(['.json']);
const JSON_FILE_MIME_TYPES = new Set([
  'application/json',
  'text/json',
  'application/octet-stream',
]);

function normalizeExtension(filename = '') {
  return path.extname(String(filename || '')).trim().toLowerCase();
}

function normalizeMimeType(value = '') {
  return String(value || '').split(';')[0].trim().toLowerCase();
}

function isAllowedImageMimeType(mimeType = '') {
  return IMAGE_MIME_TYPES.has(normalizeMimeType(mimeType));
}

function isAllowedBase64DocumentMimeType(mimeType = '') {
  return BASE64_DOCUMENT_MIME_TYPES.has(normalizeMimeType(mimeType));
}

function isAllowedImportFile({ originalname = '', mimetype = '' } = {}) {
  const extension = normalizeExtension(originalname);
  const normalizedMimeType = normalizeMimeType(mimetype);

  if (!IMPORT_FILE_EXTENSIONS.has(extension)) return false;
  if (!normalizedMimeType) return true;

  return IMPORT_FILE_MIME_TYPES.has(normalizedMimeType);
}

function isAllowedJsonFile({ originalname = '', mimetype = '' } = {}) {
  const extension = normalizeExtension(originalname);
  const normalizedMimeType = normalizeMimeType(mimetype);

  if (!JSON_FILE_EXTENSIONS.has(extension)) return false;
  if (!normalizedMimeType) return true;

  return JSON_FILE_MIME_TYPES.has(normalizedMimeType);
}

module.exports = {
  isAllowedImageMimeType,
  isAllowedBase64DocumentMimeType,
  isAllowedImportFile,
  isAllowedJsonFile,
  normalizeExtension,
  normalizeMimeType,
};
