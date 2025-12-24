
const https = require('https');
const fs = require('fs');

const API_KEY = '1id_bWVK4BWoMNklm2Y';
const DOMAIN = 'tesla.com';
// const ASSET_URL = '...'; // We'll get a fresh one from search

const logFile = fs.createWriteStream('debug_output.txt');
function log(msg) {
    console.log(msg);
    logFile.write(msg + '\n');
}

function fetchJson(url, headers = {}) {
    return new Promise((resolve) => {
        log(`\n--- Fetching JSON: ${url} ---`);
        const options = { headers };
        https.get(url, options, (res) => {
            log(`Status: ${res.statusCode}`);
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    log('Success.');
                    resolve(json);
                } catch (e) {
                    log('Failed to parse JSON.');
                    log('Raw body: ' + data.substring(0, 200) + '...');
                    resolve(null);
                }
            });
        }).on('error', e => {
            log(`Error: ${e.message}`);
            resolve(null);
        });
    });
}

function fetchHead(url) {
    return new Promise((resolve) => {
        log(`\n--- HEAD: ${url} ---`);
        const options = {
            method: 'HEAD', headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        };
        const req = https.request(url, options, (res) => {
            log(`Status: ${res.statusCode}`);
            log(`Location: ${res.headers.location || 'none'}`);
            resolve();
        });
        req.on('error', e => {
            log(`Error: ${e.message}`);
            resolve();
        });
        req.end();
    });
}

async function run() {
    // 1. Search API
    const searchUrl = `https://api.brandfetch.io/v2/search/${DOMAIN}`;
    const searchData = await fetchJson(searchUrl, { 'Authorization': `Bearer ${API_KEY}` });

    if (searchData && Array.isArray(searchData) && searchData.length > 0) {
        const match = searchData.find(d => d.domain === DOMAIN);
        if (match) {
            log('Found match for ' + DOMAIN);
            log('Icon URL: ' + match.icon);
            // Test if this Icon URL is accessible
            if (match.icon) await fetchHead(match.icon);
        } else {
            log('No exact match found in search results.');
        }
    } else {
        log('Search returned no array or empty.');
    }

    // 2. Brands API (Detailed)
    const brandsUrl = `https://api.brandfetch.io/v2/brands/${DOMAIN}`;
    const brandsData = await fetchJson(brandsUrl, { 'Authorization': `Bearer ${API_KEY}` });

    if (brandsData) {
        log('Brands API returned data.');
        if (brandsData.logos) {
            log(`Found ${brandsData.logos.length} logos.`);
            for (const logo of brandsData.logos) {
                if (logo.formats) {
                    for (const fmt of logo.formats) {
                        log(`Logo format: ${fmt.src}`);
                        await fetchHead(fmt.src);
                        // Just test the first one
                        break;
                    }
                }
            }
        }
    }

    // 3. CDN fallback test
    const cdnUrl = `https://cdn.brandfetch.io/${DOMAIN}?c=${API_KEY}`;
    await fetchHead(cdnUrl);

    logFile.end();
}

run();
