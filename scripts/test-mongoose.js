const mongoose = require('mongoose');

// Verified URI
const uri = "mongodb://ADMIN:fALL1992fALL1992@G8CA1C3143F5562-CYI5591KOO1PYFM8.adb.ca-toronto-1.oraclecloudapps.com:27017/qt_portfolio?authMechanism=PLAIN&authSource=$external&ssl=true&retryWrites=false&loadBalanced=true";

async function testMongoose() {
    console.log('Testing Mongoose Connection...');

    const opts = {
        bufferCommands: false,
        dbName: 'qt_portfolio',
        // The exact options we put in dbConnect.ts
        authMechanism: 'PLAIN',
        authSource: '$external',
        tls: true,
        tlsAllowInvalidCertificates: true,
    };

    try {
        // 1. Connect
        await mongoose.connect(uri, opts);
        console.log('✅ Mongoose connected successfully');

        // 2. Define Schema/Model (Simplified)
        const categorySchema = new mongoose.Schema({
            name: String,
            order: Number
        }, { collection: 'notecategories' });

        // Check if model already exists to prevent overwrite error in re-runs (less relevant for script)
        const NoteCategory = mongoose.models.NoteCategory || mongoose.model('NoteCategory', categorySchema);

        // 3. Query
        console.log('Attempting to find categories...');
        const result = await NoteCategory.find({}).sort({ order: 1 });
        console.log(`✅ Query successful! Found ${result.length} categories.`);
        if (result.length > 0) {
            console.log('Sample:', result[0]);
        }

    } catch (error) {
        console.error('❌ Mongoose Test Failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected');
    }
}

testMongoose();
