import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ===== DIETAS CRUD =====

import { diets, calendarEntries, type InsertDiet, type InsertCalendarEntry } from "../drizzle/schema";
import { and, inArray } from "drizzle-orm";

export async function getDietsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diets).where(eq(diets.userId, userId));
}

export async function getAllDiets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(diets);
}

export async function getDietByLegacyId(legacyId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(diets).where(eq(diets.legacyId, legacyId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createDiet(diet: InsertDiet) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(diets).values(diet);
  return getDietByLegacyId(diet.legacyId);
}

export async function updateDietByLegacyId(legacyId: string, userId: number, data: Partial<InsertDiet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(diets)
    .set(data)
    .where(and(eq(diets.legacyId, legacyId), eq(diets.userId, userId)));
  return getDietByLegacyId(legacyId);
}

export async function deleteDietByLegacyId(legacyId: string, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Deletar entradas do calendário associadas
  await db.delete(calendarEntries)
    .where(and(eq(calendarEntries.dietLegacyId, legacyId), eq(calendarEntries.userId, userId)));
  // Deletar a dieta
  await db.delete(diets)
    .where(and(eq(diets.legacyId, legacyId), eq(diets.userId, userId)));
  return true;
}

// ===== CALENDAR CRUD =====

export async function getCalendarByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEntries).where(eq(calendarEntries.userId, userId));
}

export async function getAllCalendarEntries() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEntries);
}

export async function getCalendarForSpecies(userId: number, speciesId: string) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(calendarEntries)
    .where(and(eq(calendarEntries.userId, userId), eq(calendarEntries.speciesId, speciesId)));
}

export async function upsertCalendarEntry(entry: InsertCalendarEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete existing entry for same user+species+day, then insert
  await db.delete(calendarEntries)
    .where(and(
      eq(calendarEntries.userId, entry.userId),
      eq(calendarEntries.speciesId, entry.speciesId),
      eq(calendarEntries.dayKey, entry.dayKey)
    ));
  await db.insert(calendarEntries).values(entry);
}

export async function removeCalendarEntry(userId: number, speciesId: string, dayKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEntries)
    .where(and(
      eq(calendarEntries.userId, userId),
      eq(calendarEntries.speciesId, speciesId),
      eq(calendarEntries.dayKey, dayKey)
    ));
}

export async function bulkUpsertCalendar(userId: number, speciesId: string, entries: { dayKey: string; dietLegacyId: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing for this species+user, then insert all
  const dayKeys = entries.map(e => e.dayKey);
  if (dayKeys.length > 0) {
    await db.delete(calendarEntries)
      .where(and(
        eq(calendarEntries.userId, userId),
        eq(calendarEntries.speciesId, speciesId),
        inArray(calendarEntries.dayKey, dayKeys)
      ));
    const values = entries.map(e => ({
      userId,
      speciesId,
      dayKey: e.dayKey,
      dietLegacyId: e.dietLegacyId,
    }));
    await db.insert(calendarEntries).values(values);
  }
}

export async function saveFullCalendarForSpecies(userId: number, speciesId: string, calendarMap: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all existing for this species+user
  await db.delete(calendarEntries)
    .where(and(
      eq(calendarEntries.userId, userId),
      eq(calendarEntries.speciesId, speciesId)
    ));
  // Insert all new entries
  const entries = Object.entries(calendarMap).map(([dayKey, dietLegacyId]) => ({
    userId,
    speciesId,
    dayKey,
    dietLegacyId,
  }));
  if (entries.length > 0) {
    await db.insert(calendarEntries).values(entries);
  }
}

// ===== MODULE ORDER =====

import { moduleOrder, topicComments } from "../drizzle/schema";
import { asc } from "drizzle-orm";

export async function getModuleOrder() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(moduleOrder).orderBy(asc(moduleOrder.sortOrder));
}

export async function saveModuleOrder(orderedModuleIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all and re-insert in order
  await db.delete(moduleOrder);
  if (orderedModuleIds.length > 0) {
    const values = orderedModuleIds.map((moduleId, idx) => ({
      moduleId,
      sortOrder: idx,
    }));
    await db.insert(moduleOrder).values(values);
  }
}

// ===== TOPIC COMMENTS =====

export async function getAllTopicComments() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(topicComments);
}

export async function upsertTopicComment(topicKey: string, comment: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete existing then insert (upsert pattern)
  await db.delete(topicComments).where(eq(topicComments.topicKey, topicKey));
  if (comment.trim()) {
    await db.insert(topicComments).values({ topicKey, comment: comment.trim() });
  }
}
