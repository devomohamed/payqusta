const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');

/**
 * Security Middleware Configuration
 * Provides protection against common attacks
 */

// ============ Rate Limiting ============

/**
 * General API Rate Limiter
 * 10 requests per minute per IP for EACH specific API route
 */
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute

  // Custom key generator: rate limit per IP AND per specific route path (ignoring query params)
  keyGenerator: (req) => {
    const routePath = (req.originalUrl || req.url).split('?')[0];
    return `${req.ip}_${routePath}`;
  },

  // Exactly 10 requests per route per minute
  max: 10,

  message: {
    success: false,
    message: 'تم تجاوز الحد المسموح من الطلبات لنفس الرابط (10 طلبات/دقيقة). يرجى الانتظار دقيقة والمحاولة لاحقاً',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

/**
 * Strict Rate Limiter for Auth endpoints
 * 20 login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة',
  },
});

/**
 * Password Reset Rate Limiter
 * 3 requests per hour per IP
 */
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة',
  },
});

/**
 * File Upload Rate Limiter
 * 20 uploads per 15 minutes per user
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'تم تجاوز عدد مرات رفع الملفات. يرجى المحاولة لاحقاً'
  },
});

// ============ CORS Configuration ============

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    // Reflect the request origin for browser-based app domains.
    // Auth is enforced by JWT; strict origin pinning breaks Cloud Run URLs,
    // preview domains, and tenant custom domains.
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
  exposedHeaders: ['Content-Disposition'],
};

// ============ Helmet Configuration ============

const isProduction = process.env.NODE_ENV === 'production';
const hasHttps = process.env.ENABLE_HTTPS === 'true';
const useSecureHeaders = isProduction && hasHttps;

const helmetConfig = helmet({
  contentSecurityPolicy: useSecureHeaders ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
    },
  } : false, // Disable CSP in development
  // Avoid secure-context headers when app is served over plain HTTP.
  originAgentCluster: useSecureHeaders,
  crossOriginOpenerPolicy: useSecureHeaders ? { policy: 'same-origin' } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: useSecureHeaders ? {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  noSniff: true, // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' }, // X-Frame-Options: DENY
  xssFilter: true, // X-XSS-Protection: 1; mode=block
});

// ============ Mongo Sanitization ============

const mongoSanitizeConfig = mongoSanitize();

// ============ Export ============

module.exports = {
  apiLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  corsOptions,
  corsMiddleware: cors(corsOptions),
  helmetConfig,
  mongoSanitizeConfig,
};
