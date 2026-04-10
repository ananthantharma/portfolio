require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const logs = await db.collection('access_logs').find({}).sort({timestamp: -1}).limit(5).toArray();
  console.log(logs);
  process.exit(0);
}
test();
