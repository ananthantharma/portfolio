import {neon} from '@neondatabase/serverless';

export function getDb() {
  const sql = neon(process.env.NEON_DATABASE_URL!);
  return sql;
}
