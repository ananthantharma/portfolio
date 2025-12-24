const { MongoClient } = require('mongodb');

// Verified URI
const uri = "mongodb://ADMIN:fALL1992fALL1992@G8CA1C3143F5562-CYI5591KOO1PYFM8.adb.ca-toronto-1.oraclecloudapps.com:27017/qt_portfolio?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true";

async function auditData() {
    console.log('--- Data Ownership Audit ---');
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
            console.error('❌ User lankanprinze@gmail.com NOT FOUND in qt_portfolio.');
            return;
        }
        const userId = user._id.toString();
        console.log(`✅ Target User: ${user.name} (${user.email})`);
        console.log(`   ID: ${userId}`);

        // 2. Scan All Collections
        const collections = await db.listCollections().toArray();
        const exclude = ['users', 'sessions', 'accounts', 'verification_requests', 'system.indexes'];

        console.log('\n--- Collection Scan ---');
        for (const col of collections) {
            if (exclude.includes(col.name)) continue;

            const collection = db.collection(col.name);
            const total = await collection.countDocuments();

            if (total === 0) {
                console.log(`\n📂 ${col.name}: EMPTY`);
                continue;
            }

            // Check for various ownership fields
            // convert userId to string for comparison if it's an ObjectId in DB
            // We'll exact match string or objectId
            const owned = await collection.countDocuments({
                $or: [
                    { userId: user._id },
                    { userId: userId },
                    { user_id: user._id },
                    { user_id: userId }
                ]
            });

            const unlinked = await collection.countDocuments({
                $and: [
                    { userId: { $exists: false } },
                    { user_id: { $exists: false } },
                    { owner: { $exists: false } }
                ]
            });

            const otherOwner = total - (owned + unlinked); // Rough calc

            console.log(`\n📂 ${col.name}: ${total} total`);
            console.log(`   ✅ Owned by You: ${owned}`);
            if (unlinked > 0) console.log(`   ⚠️ Unlinked (No ID): ${unlinked}`);
            if (otherOwner > 0) {
                console.log(`   ❓ Other Owner:    ${otherOwner}`);
                // Sample one to see who owns it
                const sample = await collection.findOne({
                    $nor: [
                        { userId: user._id },
                        { userId: userId },
                        { user_id: user._id },
                        { user_id: userId },
                        { userId: { $exists: false } }
                    ]
                });
                if (sample) console.log(`      Sample Mismatch ID: ${sample.userId || sample.user_id}`);
            }

            // Check if any items are unlinked, we might want to auto-fix?
            // For now just reporting.
        }

    } catch (error) {
        console.error('Audit failed:', error);
    } finally {
        await client.close();
    }
}

auditData();
