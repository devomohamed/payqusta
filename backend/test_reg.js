const axios = require('axios');

async function testRegistration() {
    const timestamp = Date.now();
    const userData1 = {
        name: `Test User ${timestamp}`,
        email: `test1_${timestamp}@example.com`,
        phone: `010${Math.floor(Math.random() * 100000000)}`,
        password: 'password123',
        storeName: `Store ${timestamp} A`,
    };

    const userData2 = {
        name: `Test User ${timestamp + 1}`,
        email: `test2_${timestamp}@example.com`,
        phone: `010${Math.floor(Math.random() * 100000000)}`,
        password: 'password123',
        storeName: `Store ${timestamp} B`,
    };

    try {
        console.log('Registering user 1...');
        const res1 = await axios.post('http://localhost:5000/api/v1/auth/register', userData1);
        console.log('User 1 registered successfully.', res1.data.message);

        console.log('Registering user 2...');
        const res2 = await axios.post('http://localhost:5000/api/v1/auth/register', userData2);
        console.log('User 2 registered successfully.', res2.data.message);

        console.log('SUCCESS: No E11000 duplicate key error on customDomain!');
    } catch (err) {
        console.error('FAILED. Error:', err.response ? err.response.data : err.message);
    }
}

testRegistration();
