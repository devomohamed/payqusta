/**
 * PayQusta — Main Server Entry Point
 * Multi-Vendor SaaS CRM System
 * 
 * @author PayQusta Team
 * @version 1.0.0
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const connectDB = require('./src/config/database');
const { errorHandler, notFound } = require('./src/middleware/errorHandler');
const { serveUploadedFile } = require('./src/middleware/upload');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');
const swaggerSpec = require('./src/config/swagger');
const swaggerUi = require('swagger-ui-express');

// Import scheduled jobs
const InstallmentScheduler = require('./src/jobs/InstallmentScheduler');
const StockMonitorJob = require('./src/jobs/StockMonitorJob');
const ProductTrendsJob = require('./src/jobs/ProductTrendsJob');
const {
  migrateLocalUploadsToDatabase,
  shouldRunLocalUploadMigration,
} = require('./src/services/uploadMigrationService');

class PayQustaServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;

    // Behind a reverse proxy (Render / Nginx) we need correct IPs & HTTPS detection
    this.app.set('trust proxy', 1);
  }

  /**
   * Initialize all server configurations
   */
  async initialize() {
    await this._connectDatabase();
    this._configureMiddleware();
    this._configureRoutes();
    this._configureErrorHandling();
    this._startScheduledJobs();
  }

  /**
   * Connect to MongoDB
   */
  async _connectDatabase() {
    await connectDB();

    // One-time Data Migration: Clear legacy whatsapp string fields
    try {
      const Customer = require('./src/models/Customer');
      const Tenant = require('./src/models/Tenant');

      // Clear whatsapp if it's a string in Customer
      await Customer.updateMany(
        { whatsapp: { $type: 'string' } },
        [
          { $set: { whatsappNumber: '$whatsapp' } },
          { $unset: ['whatsapp'] }
        ]
      );

      // Clear whatsapp if it's a string in Tenant
      await Tenant.updateMany(
        { whatsapp: { $type: 'string' } },
        { $unset: { whatsapp: 1 } }
      );

      logger.info('✅ Data migration for WhatsApp fields completed');
    } catch (err) {
      logger.error(`❌ Data migration failed: ${err.message}`);
    }

    this._scheduleLocalUploadMigration();
  }

  _scheduleLocalUploadMigration() {
    if (!shouldRunLocalUploadMigration()) {
      return;
    }

    setImmediate(() => {
      migrateLocalUploadsToDatabase({ logger })
        .catch((error) => {
          logger.error(`[UPLOAD_MIGRATION] Failed during startup: ${error.message}`);
        });
    });
  }

  /**
   * Configure Express middleware stack
   */
  _configureMiddleware() {
    // Add Request ID
    this.app.use((req, res, next) => {
      req.requestId = req.headers['x-request-id'] || uuidv4();
      res.setHeader('x-request-id', req.requestId);
      next();
    });

    const security = require('./src/middleware/security');

    // Security headers with Helmet
    this.app.use(security.helmetConfig);

    // Apply CORS to API routes only. Frontend assets/pages should not be blocked.
    this.app.use('/api', security.corsMiddleware);

    // Rate limiting
    this.app.use('/api', security.apiLimiter);
    this.app.use('/api/v1/auth/login', security.authLimiter);
    this.app.use('/api/v1/auth/register', security.authLimiter);
    this.app.use('/api/v1/auth/forgot-password', security.passwordResetLimiter);
    this.app.use('/api/v1/auth/reset-password', security.passwordResetLimiter);

    // Body parsing
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Handle JSON parse errors (e.g. body sent as "null" literal string)
    this.app.use((err, req, res, next) => {
      if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'طلب غير صالح — الـ JSON المرسل غير صحيح' });
      }
      next(err);
    });

    // Sanitize data against NoSQL injection
    this.app.use(security.mongoSanitizeConfig);

    // Prevent HTTP param pollution
    this.app.use(hpp());

    // Compression
    this.app.use(compression());

    // Logging — Morgan writes HTTP requests to Winston (dev + prod)
    morgan.token('id', (req) => req.requestId);
    const morganFormat = process.env.NODE_ENV === 'development'
      ? ':id :method :url :status :response-time ms - :res[content-length]'
      : ':id :remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"';

    this.app.use(morgan(morganFormat, {
      stream: { write: (message) => logger.info(message.trim(), { type: 'http' }) }
    }));

    // Static files
    this.app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
    this.app.get('/uploads/*', serveUploadedFile);
  }

  /**
   * Configure API routes
   */
  _configureRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'PayQusta API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      });
    });

    // Swagger API Documentation
    this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'PayQusta API Documentation',
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
      },
    }));
    this.app.get('/api-docs.json', (req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // API routes
    this.app.use('/api/v1', routes);

    // Serve frontend in production
    if (process.env.NODE_ENV === 'production') {
      const frontendDistPath = path.join(__dirname, '../frontend/dist');
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

      this.app.use(express.static(frontendDistPath, { setHeaders: setFrontendCacheHeaders }));
      this.app.get('*', (req, res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.sendFile(path.join(frontendDistPath, 'index.html'));
      });
    }
  }

  /**
   * Configure error handling
   */
  _configureErrorHandling() {
    this.app.use(notFound);
    this.app.use(errorHandler);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error(`Unhandled Rejection: ${err.message}`);
      this.server.close(() => process.exit(1));
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err) => {
      logger.error(`Uncaught Exception: ${err.message}`);
      process.exit(1);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      this.server.close(() => {
        logger.info('Process terminated.');
      });
    });
  }

  /**
   * Start scheduled background jobs
   */
  _startScheduledJobs() {
    const installmentScheduler = new InstallmentScheduler();
    installmentScheduler.start();

    const stockMonitor = new StockMonitorJob();
    stockMonitor.start();

    const productTrends = new ProductTrendsJob();
    productTrends.start();

    logger.info('✅ Scheduled jobs started');
  }

  /**
   * Start the server
   */
  async start() {
    await this.initialize();

    this.server = this.app.listen(this.port, () => {
      logger.info(`
╔══════════════════════════════════════════════╗
║         🚀 PayQusta Server Started           ║
║──────────────────────────────────────────────║
║  Environment : ${process.env.NODE_ENV || 'development'}
║  Port        : ${this.port}
║  API URL     : http://localhost:${this.port}/api/v1
║  Health      : http://localhost:${this.port}/api/health
║  API Docs    : http://localhost:${this.port}/api-docs
╚══════════════════════════════════════════════╝
      `);
    });

    return this.server;
  }
}

// Create and start server instance
const server = new PayQustaServer();
server.start().catch((err) => {
  logger.error(`Failed to start server: ${err.message}`);
  process.exit(1);
});

module.exports = server;
