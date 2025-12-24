
const https = require('https');

const DOMAIN = 'tesla.com';
const BAD_BRANDFETCH_URL = 'https://cdn.brandfetch.io/id2S-kXbuK/w/128/h/128/fallback/lettermark/icon.webp?c=1ax1766695016856bfumLaCV7mmpDj-_5u';

function checkUrl(url) {
    return new Promise((resolve) => {
        if (!url) { resolve(false); return; }
        const options = {
            method: 'HEAD', headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        };
        const req = https.request(url, options, (res) => {
            console.log(`Checked ${url} -> Status: ${res.statusCode}`);
            // Accept 200 or 301/302 (redirects might work in browser if not hotlinking restricted)
            // But wait, my previous test showed 404 for the bad URL.
            // And 302 for the CDN URL (which is hotlinking restriction).
            // A 302 to 'logo-link' is BAD.
            if (res.statusCode === 200) resolve(true);
            else resolve(false);
        });
        req.on('error', () => resolve(false));
        req.end();
    });
}

async function run() {
    console.log('Testing Fallback Logic...');

    // 1. Simulate finding a bad Brandfetch URL
    console.log('Step 1: Checking potential Brandfetch match...');
    const isValid = await checkUrl(BAD_BRANDFETCH_URL);

    let finalUrl;
    if (isValid) {
        console.log('Brandfetch URL is valid. redirecting there.');
        finalUrl = BAD_BRANDFETCH_URL;
    } else {
        console.log('Brandfetch URL failed check. Falling back to Google.');
        finalUrl = `https://www.google.com/s2/favicons?domain=${DOMAIN}&sz=128`;
    }

    console.log(`Final Redirect Target: ${finalUrl}`);

    // 2. Verify Google URL works (expecting 200 or 3xx)
    // Note: Google returns 301. Standard fetch follows redirect? No, https.request/get doesn't auto-follow.
    // So status should be 301.
    // Browser will follow 301.
}

run();
