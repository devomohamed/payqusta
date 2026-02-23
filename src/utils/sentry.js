/**
 * Sentry Error Tracking Initialization
 * Add SENTRY_DSN to your .env file to enable error tracking.
 */
const Sentry = require('@sentry/node');

const initSentry = (app) => {
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
        console.log('[Sentry] SENTRY_DSN not set, skipping initialization.');
        return;
    }

    Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
        integrations: [
            Sentry.httpIntegration(),
            Sentry.expressIntegration({ app }),
        ],
    });

    console.log(`[Sentry] Initialized in ${process.env.NODE_ENV || 'development'} mode.`);
};

const sentryErrorHandler = () => {
    if (!process.env.SENTRY_DSN) {
        return (err, req, res, next) => next(err);
    }
    return Sentry.expressErrorHandler();
};

module.exports = { initSentry, sentryErrorHandler, Sentry };
