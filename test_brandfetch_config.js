
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const envKey = process.env.BRANDFETCH_API_KEY;
const userKey = '1id_bWVK4BWoMNklm2Y';
const domain = 'tesla.com';

const testImageFetch = (key, label) => {
    const url = `https://cdn.brandfetch.io/${domain}?c=${key}`;
    console.log(`Testing ${label} with URL: ${url}`);

    const options = {
        headers: {
            'Referer': 'http://localhost:3000',
            'User-Agent': 'Mozilla/5.0'
        }
    };

    https.get(url, options, (res) => {
        console.log(`${label} Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log(`${label} SUCCESS: Image found.`);
        } else if (res.statusCode === 302 || res.statusCode === 301) {
            console.log(`${label} REDIRECT: ${res.headers.location}`);
        } else {
            console.log(`${label} FAILED: ${res.statusCode}`);
        }
        res.resume();
    }).on('error', (e) => {
        console.error(`${label} Error: ${e.message}`);
    });
};

console.log(`Env Key: ${envKey ? (envKey.substr(0, 5) + '...') : 'Not Found'}`);
testImageFetch(userKey, 'USER_KEY');
