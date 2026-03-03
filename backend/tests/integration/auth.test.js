const { createApiClient } = require('../helpers/apiClient');

describe('Auth API scaffold', () => {
  const api = createApiClient();

  it('returns health response', async () => {
    const res = await api.get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBeDefined();
  });

  it('rejects malformed login payload', async () => {
    const res = await api
      .post('/api/v1/auth/login')
      .send({});

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});
