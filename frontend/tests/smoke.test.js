/* Frontend Smoke Tests Script 
 * Validating structural API utility requests using fetch 
 */

import http from 'http';
import https from 'https';

const API_BASE_URL = 'http://localhost:5000/api/v1';

async function testEndpoint(name, url, options = {}) {
    console.log(`\nTesting [${name}] -> ${url}`);
    try {
        const res = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            }
        });

        // We expect some valid HTTP response. 500 is failure, others (like 401 unauth or 400 bad payload) are okay for a basic smoke test if structural.
        if (res.status === 500) {
            console.error(`❌ FAILED: ${name} (Status: 500 Server Error)`);
            process.exitCode = 1;
        } else {
            console.log(`✅ PASSED: ${name} (Status: ${res.status})`);
        }
    } catch (err) {
        console.error(`❌ NETWORK ERROR: ${name} (${err.message})`);
        process.exitCode = 1;
    }
}

async function runAllTests() {
    console.log('Starting Frontend API Smoke Tests...');

    await testEndpoint('Login', '/auth/login', { method: 'POST', body: JSON.stringify({}) });
    await testEndpoint('Register', '/auth/register', { method: 'POST', body: JSON.stringify({}) });

    await testEndpoint('Get Products', '/products', { method: 'GET' });
    await testEndpoint('Get Customers', '/customers', { method: 'GET' });
    await testEndpoint('Get Invoices', '/invoices', { method: 'GET' });

    console.log('\nDone.');
}

runAllTests();
