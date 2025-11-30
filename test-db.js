const { MongoClient } = require('mongodb');

// Testing the alternative credentials found earlier
const uri = "mongodb+srv://lankanprinze:Tpaa7899@cluster0users.i4twgal.mongodb.net/?appName=Cluster0Users";

console.log('Testing connection to:', uri.replace(/:([^:@]+)@/, ':****@'));

const client = new MongoClient(uri);

async function run() {
    try {
        await client.connect();
        console.log("Successfully connected to MongoDB!");
        const db = client.db("test");
        const result = await db.command({ ping: 1 });
        console.log("Ping result:", result);
    } catch (error) {
        console.error("Connection failed:", error);
    } finally {
        await client.close();
    }
}

run();
