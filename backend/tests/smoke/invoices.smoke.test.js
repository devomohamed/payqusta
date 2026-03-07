const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Invoices API Smoke Tests', () => {
    let api;

    beforeAll(() => {
        api = request(createApp());
    });

    test('GET /api/v1/invoices should not return 500', async () => {
        const res = await api.get('/api/v1/invoices');
        expect(res.status).not.toBe(500);
    });

    test('POST /api/v1/invoices should not return 500', async () => {
        const res = await api.post('/api/v1/invoices').send({});
        // Depending on auth guards, it might be 401 or 400. Main thing is no 500.
        expect(res.status).not.toBe(500);
    });
});
