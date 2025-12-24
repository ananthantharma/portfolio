
require('dotenv').config({ path: '.env.local' });
const https = require('https');

const apiKey = process.env.BRANDFETCH_API_KEY; // The user said this is "1id..."
const query = 'tesla.com';

if (!apiKey) {
    console.error('No API Key found');
    process.exit(1);
}

const options = {
    hostname: 'api.brandfetch.io',
    path: `/v2/search/${encodeURIComponent(query)}`,
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
    }
};

console.log(`Searching for ${query} using key starting with ${apiKey.substring(0, 4)}...`);

const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        try {
            const json = JSON.parse(data);
            if (Array.isArray(json)) {
                const match = json.find(b => b.domain === query);
                if (match) {
                    console.log('Match found:', JSON.stringify(match, null, 2));
                    if (match.icon) {
                        console.log('ICON URL:', match.icon);
                    } else {
                        console.log('No icon field in match');
                    }
                } else {
                    console.log('No exact domain match found. First result:', JSON.stringify(json[0], null, 2));
                }
            } else {
                console.log('Response is not an array:', data);
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
            console.log('Raw Body:', data);
        }
    });
});

req.on('error', (error) => {
    console.error('Error:', error);
});

req.end();
