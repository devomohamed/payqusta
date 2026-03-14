const { createApiClient } = require('../helpers/apiClient');

describe('Auth API scaffold', () => {
  const api = createApiClient();

  it('returns health response', async () => {
    const res = await api.get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
    expect(res.body.live).toBe(true);
    expect(res.body.checks).toBeDefined();
  });

  it('returns liveness response', async () => {
    const res = await api.get('/api/health/live');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.live).toBe(true);
  });

  it('returns not ready when database is disconnected in app-only tests', async () => {
    const res = await api.get('/api/health/ready');

    expect(res.statusCode).toBe(503);
    expect(res.body.ready).toBe(false);
    expect(res.body.checks.database.ready).toBe(false);
  });

  it('rejects malformed login payload', async () => {
    const res = await api
      .post('/api/v1/auth/login')
      .send({});

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
