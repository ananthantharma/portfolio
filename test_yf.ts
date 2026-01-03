import * as pkg from 'yahoo-finance2';

console.log('Package keys:', Object.keys(pkg));

// Check default export
const def = pkg.default;
console.log('Default export type:', typeof def);

try {
    // @ts-ignore
    const instance = new def();
    console.log('Successfully instantiated default export.');
    instance.quote('AAPL').then((q: any) => console.log('Quote from new instance:', q.regularMarketPrice));
} catch (e: any) {
    console.log('Default export is NOT a constructor:', e.message);
}

// Check if there is a named export 'yahooFinance'
// @ts-ignore
if (pkg.yahooFinance) {
    console.log('Found named export "yahooFinance"');
    // @ts-ignore
    pkg.yahooFinance.quote('AAPL').then((q: any) => console.log('Quote from named export:', q.regularMarketPrice)).catch((e: any) => console.error('Named export error:', e.message));
} else {
    // If default is an object (instance)
    if (typeof def === 'object') {
        // @ts-ignore
        def.quote('AAPL').then((q: any) => console.log('Quote from default object:', q.regularMarketPrice)).catch((e: any) => console.error('Default object error:', e.message));
    }
}
