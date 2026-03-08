/**
 * Global Error Handling Middleware
 * Centralizes all error responses
 */

const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const { PRODUCT_IMAGE_UPLOAD_LIMIT } = require('./upload');

/**
 * Handle specific Mongoose errors
 */
const handleCastError = (err) => {
  return new AppError(`قيمة غير صالحة: ${err.value}`, 400);
};

const handleDuplicateKey = (err) => {
  const keyValue = err.keyValue || {};
  const keyPattern = err.keyPattern || {};
  const keys = Object.keys(keyValue);
  const patternKeys = Object.keys(keyPattern);

  let field = keys[0] || patternKeys[0] || 'value';

  if (field === 'tenant') {
    const secondaryField = [...keys, ...patternKeys].find((key) => key && key !== 'tenant');
    if (secondaryField) {
      field = secondaryField;
    } else {
      return new AppError('تعذر الحفظ بسبب تعارض داخلي في بيانات المتجر. يرجى إعادة المحاولة.', 409);
    }
  }

  const translations = {
    barcode: 'الباركود',
    internationalBarcode: 'الباركود الدولي',
    localBarcode: 'الباركود المحلي',
    sku: 'كود SKU',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    nationalId: 'الرقم القومي',
    whatsappNumber: 'رقم واتساب',
    customDomain: 'النطاق المخصص',
    subdomain: 'رابط المتجر',
    slug: 'رابط المتجر',
    name: 'الاسم'
  };

  const fieldName = translations[field] || field;
  const value = keyValue[field];

  if (value === undefined || value === null || value === '') {
    return new AppError(`هذه القيمة مستخدمة بالفعل في حقل "${fieldName}"`, 409);
  }

  return new AppError(`القيمة "${value}" مستخدمة بالفعل في حقل "${fieldName}"`, 409);
};

const handleValidationError = (err) => {
  const messages = Object.values(err.errors)
    .filter((e) => e.path !== 'tenant')
    .map((e) => e.message.replace(/tenant/gi, 'المتجر'));

  if (messages.length === 0) return new AppError('بيانات غير صالحة أو مفقودة', 422);
  return new AppError(messages.join('. '), 422);
};

const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return AppError.badRequest('حجم الملف أكبر من الحد المسموح للرفع');
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    if (err.field === 'images') {
      return AppError.badRequest(`يمكن رفع حتى ${PRODUCT_IMAGE_UPLOAD_LIMIT} صور للمنتج في المرة الواحدة`);
    }

    return AppError.badRequest('تم إرسال حقل ملفات غير متوقع');
  }

  return AppError.badRequest('تعذر رفع الملفات المرسلة');
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err, message: err.message, stack: err.stack };

  logger.error(`${err.name}: ${err.message}`, {
    path: req.path,
    method: req.method,
    stack: err.stack,
    requestId: req.requestId,
    tenantId: req.tenantId,
    userId: req.user?._id
  });

  if (err.name === 'CastError') error = handleCastError(err);
  if (err.code === 11000) error = handleDuplicateKey(err);
  if (err.name === 'ValidationError') error = handleValidationError(err);
  if (err.name === 'MulterError') error = handleMulterError(err);

  const statusCode = error.statusCode || 500;
  const message = error.isOperational
    ? error.message
    : 'حدث خطأ داخلي في الخادم';

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
};

/**
 * 404 Not Found handler
 */
const notFound = (req, res, next) => {
  next(new AppError(`المسار ${req.originalUrl} غير موجود`, 404));
};

module.exports = { errorHandler, notFound };
