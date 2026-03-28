const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_QAt2gVP3CLEx@ep-calm-wildflower-anuigs73-pooler.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require');

async function test() {
  const fields = await sql`SELECT * FROM fields`;
  console.log(fields.map(f => ({t: f.type, x: f.pos_x, y: f.pos_y, val: f.value ? 'Yes' : 'No'})));
}
test().catch(console.error);
