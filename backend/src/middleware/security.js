const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const { URL } = require('url');

/**
 * Security Middleware Configuration
 * Provides protection against common attacks
 */

// ============ Rate Limiting ============

const isDevelopment = process.env.NODE_ENV !== 'production';
const apiWindowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS) || (1 * 60 * 1000);
const writeApiMax = Number(process.env.API_RATE_LIMIT_MAX) || (isDevelopment ? 180 : 60);
const readApiMax = Number(process.env.API_READ_RATE_LIMIT_MAX) || (isDevelopment ? 600 : 180);

/**
 * General API Rate Limiter
 * We rate-limit by route path and IP.
 * Read requests get a higher ceiling because the dashboard and sync service poll often.
 */
const apiLimiter = rateLimit({
  windowMs: apiWindowMs,

  keyGenerator: (req) => {
    const routePath = (req.originalUrl || req.url).split('?')[0];
    return `${req.ip}_${routePath}`;
  },

  max: (req) => {
    const method = String(req.method || 'GET').toUpperCase();
    return method === 'GET' || method === 'HEAD' || method === 'OPTIONS'
      ? readApiMax
      : writeApiMax;
  },

  message: {
    success: false,
    message: `تم تجاوز الحد المسموح من الطلبات لهذا الرابط. حد القراءة ${readApiMax} طلب وحد التعديل ${writeApiMax} طلب خلال ${Math.max(1, Math.round(apiWindowMs / 60000))} دقيقة.`,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict Rate Limiter for Auth endpoints
 * 20 failed login attempts per 15 minutes per IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'تم تجاوز عدد محاولات تسجيل الدخول. يرجى المحاولة بعد 15 دقيقة.',
  },
});

/**
 * Portal auth limiter
 * Protects customer login brute-force attempts.
 */
const portalAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.PORTAL_AUTH_RATE_LIMIT_MAX) || 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many portal login attempts. Please try again later.',
  },
});

/**
 * Portal enrollment limiter
 * Protects public register/activate endpoints from abuse.
 */
const portalEnrollmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.PORTAL_ENROLLMENT_RATE_LIMIT_MAX) || 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many portal activation or registration attempts. Please try again later.',
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
    message: 'تم تجاوز عدد محاولات إعادة تعيين كلمة المرور. يرجى المحاولة بعد ساعة.',
  },
});

/**
 * File Upload Rate Limiter
 * 20 uploads per 15 minutes per user/IP
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'تم تجاوز عدد مرات رفع الملفات. يرجى المحاولة لاحقًا.',
  },
});

/**
 * Webhook Rate Limiter
 * Public provider endpoints should stay reachable, but not unbounded.
 */
const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: Number(process.env.WEBHOOK_RATE_LIMIT_MAX) || (isDevelopment ? 300 : 120),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many webhook requests. Please retry later.',
  },
});

// ============ CORS Configuration ============

const PLATFORM_ROOT_DOMAIN = String(process.env.PLATFORM_ROOT_DOMAIN || 'payqusta.store')
  .trim()
  .toLowerCase();

const normalizeOrigin = (origin) => {
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`.toLowerCase();
  } catch (error) {
    return null;
  }
};

const parseConfiguredOrigins = (...values) => {
  const origins = new Set();

  values
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => normalizeOrigin(value.trim()))
    .filter(Boolean)
    .forEach((origin) => origins.add(origin));

  return origins;
};

const isPlatformOrigin = (origin) => {
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  try {
    const { hostname } = new URL(normalized);
    return hostname === PLATFORM_ROOT_DOMAIN || hostname.endsWith(`.${PLATFORM_ROOT_DOMAIN}`);
  } catch (error) {
    return false;
  }
};

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
];

const configuredProductionOrigins = parseConfiguredOrigins(
  process.env.CLIENT_URL,
  process.env.APP_URL,
  process.env.CORS_ALLOWED_ORIGINS
);

const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
      return callback(null, false);
    }

    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    if (isDevelopment) {
      // In development we still allow arbitrary preview origins to avoid blocking local workflows.
      return callback(null, true);
    }

    if (
      configuredProductionOrigins.has(normalizedOrigin) ||
      isPlatformOrigin(normalizedOrigin) ||
      normalizedOrigin.endsWith('.run.app') ||
      normalizedOrigin.endsWith('.a.run.app')
    ) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID', 'X-Source'],
  exposedHeaders: ['Content-Disposition'],
  optionsSuccessStatus: 204,
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
  } : false,
  originAgentCluster: useSecureHeaders,
  crossOriginOpenerPolicy: useSecureHeaders ? { policy: 'same-origin' } : false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false,
  hsts: useSecureHeaders ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
});

// ============ Mongo Sanitization ============

const mongoSanitizeConfig = mongoSanitize();

// ============ Export ============

module.exports = {
  apiLimiter,
  authLimiter,
  portalAuthLimiter,
  portalEnrollmentLimiter,
  passwordResetLimiter,
  uploadLimiter,
  webhookLimiter,
  corsOptions,
  corsMiddleware: cors(corsOptions),
  helmetConfig,
  mongoSanitizeConfig,
};
