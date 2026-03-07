const request = require('supertest');
const { createApp } = require('../../src/app');

describe('Auth API Smoke Tests', () => {
    let api;

    beforeAll(() => {
        api = request(createApp());
    });

    test('POST /api/v1/auth/login should not return 500', async () => {
        // Intentionally sending empty data to get a 400 validation error or similar, just not 500
        const res = await api.post('/api/v1/auth/login').send({});
        expect(res.status).not.toBe(500);
    });

    test('POST /api/v1/auth/register should not return 500', async () => {
        const res = await api.post('/api/v1/auth/register').send({});
        expect(res.status).not.toBe(500);
    }, 10000); // bcrypt hash might be slow on environments without natives
});
