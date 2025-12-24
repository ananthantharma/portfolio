
const https = require('https');

const DOMAIN = 'tesla.com';
const GOOGLE_URL = `https://www.google.com/s2/favicons?domain=${DOMAIN}&sz=128`;

console.log(`Testing Google Favicon: ${GOOGLE_URL}`);

https.get(GOOGLE_URL, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Content-Type: ${res.headers['content-type']}`);
    let len = 0;
    res.on('data', c => len += c.length);
    res.on('end', () => console.log(`Downloaded ${len} bytes`));
}).on('error', console.error);
