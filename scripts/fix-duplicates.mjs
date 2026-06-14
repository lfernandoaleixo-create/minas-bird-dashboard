import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const db = drizzle(process.env.DATABASE_URL);

async function main() {
  // Find duplicates by anilha (normalized: only alphanumeric, uppercase)
  const [allBirds] = await db.execute(sql`SELECT id, ringNumber, speciesName, anilha, createdAt FROM plantel WHERE anilha IS NOT NULL AND anilha != '' ORDER BY id ASC`);
  
  console.log(`Total birds with anilha: ${allBirds.length}`);
  
  // Normalize and group
  const seen = new Map(); // normalized -> first bird
  const duplicateIds = [];
  
  for (const bird of allBirds) {
    const normalized = bird.anilha.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!normalized) continue;
    
    if (seen.has(normalized)) {
      const original = seen.get(normalized);
      console.log(`DUPLICATE: "${bird.anilha}" (id=${bird.id}, ${bird.ringNumber}) duplicates "${original.anilha}" (id=${original.id}, ${original.ringNumber})`);
      duplicateIds.push(bird.id); // keep the first one (lower id), remove the later one
    } else {
      seen.set(normalized, bird);
    }
  }
  
  console.log(`\nFound ${duplicateIds.length} duplicates to remove.`);
  
  if (duplicateIds.length > 0) {
    // Delete duplicates
    const idList = duplicateIds.join(",");
    await db.execute(sql.raw(`DELETE FROM plantel WHERE id IN (${idList})`));
    console.log(`Deleted ${duplicateIds.length} duplicate birds.`);
    
    // Verify
    const [remaining] = await db.execute(sql`SELECT COUNT(*) as cnt FROM plantel`);
    console.log(`Remaining birds: ${remaining[0].cnt}`);
  }
  
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
