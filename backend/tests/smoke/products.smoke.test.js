const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Products API Smoke Tests', () => {
    let api;

    beforeAll(() => {
        api = request(createApp());
    });

    test('GET /api/v1/products should not return 500', async () => {
        // Unauthenticated request should probably return 401, but definitely not 500
        const res = await api.get('/api/v1/products');
        expect(res.status).not.toBe(500);
    });

    test('GET /api/v1/products/:id should not return 500', async () => {
        const res = await api.get('/api/v1/products/65d5f8c9b3a4a00012345678');
        expect(res.status).not.toBe(500);
    });

    test('GET /api/v1/products/barcode/:code should not return 500', async () => {
        const res = await api.get('/api/v1/products/barcode/123456789012');
        expect(res.status).not.toBe(500);
    });
});
