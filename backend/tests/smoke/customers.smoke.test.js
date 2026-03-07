const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Customers API Smoke Tests', () => {
    let api;

    beforeAll(() => {
        api = request(createApp());
    });

    test('GET /api/v1/customers should not return 500', async () => {
        const res = await api.get('/api/v1/customers');
        expect(res.status).not.toBe(500);
    });

    test('POST /api/v1/customers should not return 500', async () => {
        const res = await api.post('/api/v1/customers').send({});
        expect(res.status).not.toBe(500);
    });
});
