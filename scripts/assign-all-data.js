const { MongoClient } = require('mongodb');

// Verified URI
const uri = "mongodb://ADMIN:fALL1992fALL1992@G8CA1C3143F5562-CYI5591KOO1PYFM8.adb.ca-toronto-1.oraclecloudapps.com:27017/qt_portfolio?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true";

async function assignAllData() {
    console.log('--- Assigning ALL Data to Main User ---');
    const client = new MongoClient(uri, {
        tls: true,
        tlsAllowInvalidCertificates: true,
    });

    try {
        await client.connect();
        const db = client.db('qt_portfolio');

        // 1. Find the Main User
        const user = await db.collection('users').findOne({ email: 'lankanprinze@gmail.com' });
        if (!user) {
            console.error('❌ User lankanprinze@gmail.com NOT FOUND.');
            return;
        }
        console.log(`✅ Claiming data for: ${user.name} (${user._id})`);

        // 2. Define target collections
        const targets = [
            'budgetitems',
            'contacts',
            'notecategories',
            'notesections',
            'notepages',
            'passwords',
            'todos',
            'transactions',
            'attachments'
        ];

        // 3. Update Loop
        for (const colName of targets) {
            console.log(`\nProcessing ${colName}...`);
            const col = db.collection(colName);

            // Update ALL documents that don't match the current user ID
            // We just update everything to be safe/sure since user said "Everything should be to that"
            const result = await col.updateMany(
                {}, // Match ALL
                { $set: { userId: user._id } }
            );

            console.log(`   ✅ Assigne ${result.modifiedCount} documents (Matched: ${result.matchedCount})`);
        }

        console.log('\n✅ All data successfully assigned!');

    } catch (error) {
        console.error('Assignment failed:', error);
    } finally {
        await client.close();
    }
}

assignAllData();
