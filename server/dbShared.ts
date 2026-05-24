/**
 * Database helpers for shared data (food calendar, diet calculator, topic order)
 * All data is shared between all users — no user-specific filtering
 */
import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  foodCalendarFoods,
  foodCalendarChecks,
  foodCalendarSpeciesFoods,
  foodCalendarSpeciesChecks,
  foodCalendarSpeciesPhase,
  dietCalcConfig,
  topicOrder,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ═══════════════════════════════════════════════════════════
// FOOD CALENDAR — GENERAL FOODS
// ═══════════════════════════════════════════════════════════

export async function getFoodCalendarFoods() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodCalendarFoods);
}

export async function addFoodCalendarFood(name: string, category: string, quality: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(foodCalendarFoods).values({ name, category, quality });
  return result.insertId;
}

export async function removeFoodCalendarFood(name: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(foodCalendarFoods).where(eq(foodCalendarFoods.name, name));
}

// ═══════════════════════════════════════════════════════════
// FOOD CALENDAR — GENERAL CHECKS
// ═══════════════════════════════════════════════════════════

export async function getFoodCalendarChecks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodCalendarChecks);
}

export async function setFoodCalendarCheck(checkKey: string, checked: boolean) {
  const db = await getDb();
  if (!db) return;
  if (checked) {
    // Upsert: insert or ignore
    await db.insert(foodCalendarChecks).values({ checkKey, checked: 1 }).onDuplicateKeyUpdate({ set: { checked: 1 } });
  } else {
    await db.delete(foodCalendarChecks).where(eq(foodCalendarChecks.checkKey, checkKey));
  }
}

// ═══════════════════════════════════════════════════════════
// FOOD CALENDAR — SPECIES FOODS
// ═══════════════════════════════════════════════════════════

export async function getFoodCalendarSpeciesFoods() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodCalendarSpeciesFoods);
}

export async function addFoodCalendarSpeciesFood(speciesId: string, name: string, category: string, quality: string) {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(foodCalendarSpeciesFoods).values({ speciesId, name, category, quality });
  return result.insertId;
}

export async function removeFoodCalendarSpeciesFood(speciesId: string, name: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(foodCalendarSpeciesFoods).where(
    and(eq(foodCalendarSpeciesFoods.speciesId, speciesId), eq(foodCalendarSpeciesFoods.name, name))
  );
}

// ═══════════════════════════════════════════════════════════
// FOOD CALENDAR — SPECIES CHECKS
// ═══════════════════════════════════════════════════════════

export async function getFoodCalendarSpeciesChecks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodCalendarSpeciesChecks);
}

export async function setFoodCalendarSpeciesCheck(speciesId: string, checkKey: string, checked: boolean) {
  const db = await getDb();
  if (!db) return;
  if (checked) {
    await db.insert(foodCalendarSpeciesChecks).values({ speciesId, checkKey, checked: 1 });
  } else {
    await db.delete(foodCalendarSpeciesChecks).where(
      and(eq(foodCalendarSpeciesChecks.speciesId, speciesId), eq(foodCalendarSpeciesChecks.checkKey, checkKey))
    );
  }
}

// ═══════════════════════════════════════════════════════════
// FOOD CALENDAR — SPECIES PHASE
// ═══════════════════════════════════════════════════════════

export async function getFoodCalendarSpeciesPhases() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(foodCalendarSpeciesPhase);
}

export async function setFoodCalendarSpeciesPhase(speciesId: string, phaseId: string) {
  const db = await getDb();
  if (!db) return;
  await db.insert(foodCalendarSpeciesPhase).values({ speciesId, phaseId })
    .onDuplicateKeyUpdate({ set: { phaseId } });
}

// ═══════════════════════════════════════════════════════════
// DIET CALCULATOR CONFIG
// ═══════════════════════════════════════════════════════════

export async function getDietCalcConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dietCalcConfig);
}

export async function setDietCalcConfig(speciesId: string, racaoId: string | null, racaoPct: number, enclosureMultiplierX100: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(dietCalcConfig).values({ speciesId, racaoId, racaoPct, enclosureMultiplierX100 })
    .onDuplicateKeyUpdate({ set: { racaoId, racaoPct, enclosureMultiplierX100 } });
}

// ═══════════════════════════════════════════════════════════
// TOPIC ORDER (Progress Map)
// ═══════════════════════════════════════════════════════════

export async function getTopicOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(topicOrder);
}

export async function setTopicOrder(moduleId: string, orderJson: number[]) {
  const db = await getDb();
  if (!db) return;
  await db.insert(topicOrder).values({ moduleId, orderJson })
    .onDuplicateKeyUpdate({ set: { orderJson } });
}
