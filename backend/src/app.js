require('dotenv').config();

const express = require('express');
const compression = require('compression');
const hpp = require('hpp');
const morgan = require('morgan');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { serveUploadedFile } = require('./middleware/upload');
const logger = require('./utils/logger');
const routes = require('./routes');
const swaggerSpec = require('./config/swagger');
const { registerOperationalRoutes } = require('./ops/registerOperationalRoutes');

function createApp() {
  const app = express();
  const security = require('./middleware/security');
  const jsonPayloadLimit = process.env.API_JSON_LIMIT || '10mb';
  const urlencodedPayloadLimit = process.env.API_FORM_LIMIT || '2mb';

  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('x-request-id', req.requestId);
    next();
  });

  app.use(security.helmetConfig);
  app.use('/api', security.corsMiddleware);
  app.use('/api', security.apiLimiter);
  app.use('/api/v1/auth/login', security.authLimiter);
  app.use('/api/v1/auth/register', security.authLimiter);
  app.use('/api/v1/auth/forgot-password', security.passwordResetLimiter);
  app.use('/api/v1/auth/reset-password', security.passwordResetLimiter);

  app.use(express.json({ limit: jsonPayloadLimit }));
  app.use(express.urlencoded({ extended: true, limit: urlencodedPayloadLimit }));

  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({
        success: false,
        message: 'طلب غير صالح - JSON المرسل غير صحيح',
      });
    }

    if (err.type === 'entity.too.large') {
      return res.status(413).json({
        success: false,
        message: 'The request body is too large for this endpoint',
      });
    }

    next(err);
  });

  app.use(security.mongoSanitizeConfig);
  app.use(hpp());
  app.use(compression());

  morgan.token('id', (req) => req.requestId);
  const morganFormat = process.env.NODE_ENV === 'development'
    ? ':id :method :url :status :response-time ms - :res[content-length]'
    : ':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

  app.use(morgan(morganFormat, {
    stream: { write: (message) => logger.info(message.trim(), { type: 'http' }) },
  }));

  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
  app.get('/uploads/*', serveUploadedFile);

  registerOperationalRoutes(app);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'PayQusta API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
    },
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.use('/api/v1', routes);

  if (process.env.NODE_ENV === 'production') {
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');
    const setFrontendCacheHeaders = (res, filePath) => {
      const normalizedPath = String(filePath || '').replace(/\\/g, '/');
      const fileName = path.basename(normalizedPath);

      const mustRevalidateFiles = (
        fileName === 'index.html' ||
        fileName === 'sw.js' ||
        fileName === 'manifest.webmanifest' ||
        fileName.startsWith('workbox-')
      );

      if (mustRevalidateFiles) {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        return;
      }

      const isHashedAsset = /\/assets\/.+\.[a-f0-9]{8,}\./i.test(normalizedPath);
      if (isHashedAsset) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600');
    };

    app.use(express.static(frontendDistPath, { setHeaders: setFrontendCacheHeaders }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
