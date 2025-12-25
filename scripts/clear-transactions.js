
// const fetch = require('node-fetch'); // Using native fetch in Node 18+

async function clearTransactions() {
    try {
        // 1. Fetch all transactions
        console.log('Fetching transactions...');
        const listRes = await fetch('http://localhost:3000/api/finance/transactions');
        const listData = await listRes.json();

        if (!listData.success || !listData.data) {
            console.error('Failed to fetch list:', listData);
            return;
        }

        const transactions = listData.data;
        console.log(`Found ${transactions.length} transactions to delete.`);

        // 2. Delete each one
        let deletedCount = 0;
        for (const t of transactions) {
            const delRes = await fetch(`http://localhost:3000/api/finance/transactions/${t._id}`, {
                method: 'DELETE'
            });
            if (delRes.ok) {
                deletedCount++;
            } else {
                console.error(`Failed to delete ${t._id}: ${delRes.status}`);
            }
        }

        console.log(`Successfully deleted ${deletedCount} transactions.`);

    } catch (err) {
        console.error('Operation failed:', err);
    }
}

clearTransactions();
