// const fetch = require('node-fetch'); // Using native fetch

async function listTransactions() {
    try {
        const res = await fetch('http://localhost:3000/api/finance/transactions');
        const data = await res.json();
        console.log('Success:', data.success);
        console.log('Count:', data.data?.length);
        console.log('Last Updated:', data.lastUpdated);
        if (data.data?.length > 0) {
            console.log('Sample Data (First 3):');
            console.log(JSON.stringify(data.data.slice(0, 3), null, 2));
        }
    } catch (err) {
        console.error('Fetch failed:', err);
    }
}

listTransactions();
