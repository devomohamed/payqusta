jest.mock('../../src/services/PaymentGatewayService', () => ({
  processWebhook: jest.fn().mockResolvedValue({ ok: true }),
}));

const paymentGatewayService = require('../../src/services/PaymentGatewayService');
const { createApiClient } = require('../helpers/apiClient');

describe('Payment webhook routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('accepts Paymob webhook calls without JWT auth', async () => {
    const api = createApiClient();

    const res = await api
      .post('/api/v1/payments/webhook/paymob')
      .send({ obj: { id: 123, order: 456 } });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(paymentGatewayService.processWebhook).toHaveBeenCalledWith('paymob', { obj: { id: 123, order: 456 } });
  });
});
