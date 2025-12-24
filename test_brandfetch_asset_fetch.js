
const https = require('https');

// URL taken from previous successful search test output
// Note: This URL might expire, but usually lasts long enough for a test.
// If it fails with 403, we know even Asset URL requires headers or is restricted.
const assetUrl = 'https://asset.brandfetch.io/id2S-kXbuK/id616856bf.svg?c=1ax1766695018617';

console.log(`Testing download from: ${assetUrl}`);

https.get(assetUrl, (res) => {
    console.log(`Status: ${res.statusCode}`);
    if (res.statusCode === 200) {
        console.log('SUCCESS: Asset is downloadable.');
        console.log('Content-Type:', res.headers['content-type']);
    } else if (res.statusCode === 301 || res.statusCode === 302) {
        console.log(`REDIRECT: ${res.headers.location}`);
    } else {
        console.log('FAILED.');
    }
}).on('error', (e) => {
    console.error('Error:', e.message);
});
