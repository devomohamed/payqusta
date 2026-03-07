const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Storefront API Smoke Tests', () => {
    let api;

    beforeAll(() => {
        api = request(createApp());
    });

    test('GET /api/v1/portal/:domain/products should not return 500', async () => {
        const res = await api.get('/api/v1/portal/somedomain/products');
        expect(res.status).not.toBe(500);
    }, 10000);

    test('GET /api/v1/portal/:domain should not return 500', async () => {
        const res = await api.get('/api/v1/portal/somedomain');
        expect(res.status).not.toBe(500);
    }, 10000);
});
