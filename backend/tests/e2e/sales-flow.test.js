const { createApiClient } = require('../helpers/apiClient');

describe('Sales flow E2E scaffold', () => {
  const api = createApiClient();

  it('documents the expected end-to-end sequence', async () => {
    const health = await api.get('/api/health');

    expect(health.statusCode).toBe(200);

    // Next implementation steps:
    // 1. Login and capture a real JWT.
    // 2. Create product fixture.
    // 3. Create customer fixture.
    // 4. Create deferred invoice.
    // 5. Pay partially, then pay all.
    // 6. Assert invoice/customer/stock side effects.
  });
});
