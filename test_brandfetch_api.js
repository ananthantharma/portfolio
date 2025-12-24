
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const userKey = '1id_bWVK4BWoMNklm2Y';
const domain = 'tesla.com';

const options = {
    hostname: 'api.brandfetch.io',
    path: `/v2/brands/${domain}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${userKey}`,
        'Content-Type': 'application/json'
    }
};

console.log(`Testing Brandfetch API v2 for ${domain}...`);

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log('SUCCESS: Brand data retrieved.');
            try {
                const json = JSON.parse(data);
                const logo = json.logos?.find(l => l.type === 'icon' || l.type === 'logo');
                if (logo) {
                    console.log('Logo URL found:', logo.formats?.[0]?.src);
                } else {
                    console.log('No logo found in response.');
                }
            } catch (e) {
                console.error('Failed to parse JSON:', e.message);
            }
        } else {
            console.log('FAILED:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
