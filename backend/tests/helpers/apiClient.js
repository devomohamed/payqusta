const request = require('supertest');
const { createApp } = require('../../src/app');

function createApiClient() {
  return request(createApp());
}

module.exports = { createApiClient };
