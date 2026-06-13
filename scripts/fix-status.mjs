import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  // Check current status distribution
  const rows = await db.execute(sql`SELECT birdStatus, COUNT(*) as cnt FROM plantel GROUP BY birdStatus`);
  console.log("Current status distribution:", rows[0]);
  
  // Update all non-ativo birds to ativo
  const result = await db.execute(sql`UPDATE plantel SET birdStatus = 'ativo' WHERE birdStatus != 'ativo'`);
  console.log("Updated rows:", result[0]);
  
  // Verify
  const after = await db.execute(sql`SELECT birdStatus, COUNT(*) as cnt FROM plantel GROUP BY birdStatus`);
  console.log("After fix:", after[0]);
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
