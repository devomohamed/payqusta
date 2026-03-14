const { createApiClient } = require('../helpers/apiClient');

describe('Security routes', () => {
  it('sets security and tracing headers on public health responses', async () => {
    const api = createApiClient();
    const res = await api.get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
  });

  it('rate limits repeated failed login attempts on the auth endpoint', async () => {
    const api = createApiClient();
    let lastResponse = null;

    for (let attempt = 0; attempt < 21; attempt += 1) {
      lastResponse = await api
        .post('/api/v1/auth/login')
        .send({});
    }

    expect(lastResponse.statusCode).toBe(429);
    expect(lastResponse.body.success).toBe(false);
    expect(lastResponse.body.message).toBeDefined();
  });

  it('rate limits repeated failed portal login attempts on the customer auth endpoint', async () => {
    const api = createApiClient();
    let lastResponse = null;

    for (let attempt = 0; attempt < 21; attempt += 1) {
      lastResponse = await api
        .post('/api/v1/portal/login')
        .send({});
    }

    expect(lastResponse.statusCode).toBe(429);
    expect(lastResponse.body.success).toBe(false);
    expect(lastResponse.body.message).toBeDefined();
  });

  it('allows configured production origins and omits untrusted origins from CORS', async () => {
    const originalEnv = { ...process.env };

    try {
      jest.resetModules();
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_URL = 'https://payqusta.store';
      process.env.APP_URL = 'https://payqusta.store';
      process.env.PLATFORM_ROOT_DOMAIN = 'payqusta.store';
      const { corsOptions } = require('../../src/middleware/security');

      const allowedOrigin = await new Promise((resolve, reject) => {
        corsOptions.origin('https://payqusta.store', (error, allowed) => {
          if (error) return reject(error);
          resolve(allowed);
        });
      });

      const blockedOrigin = await new Promise((resolve, reject) => {
        corsOptions.origin('https://evil.example', (error, allowed) => {
          if (error) return reject(error);
          resolve(allowed);
        });
      });

      expect(allowedOrigin).toBe(true);
      expect(blockedOrigin).toBe(false);
    } finally {
      jest.resetModules();
      process.env = originalEnv;
    }
  }, 15000);
});
