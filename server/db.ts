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

export async function updateDietByLegacyIdPublic(legacyId: string, data: Partial<InsertDiet>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(diets)
    .set(data)
    .where(eq(diets.legacyId, legacyId));
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

export async function deleteDietByLegacyIdPublic(legacyId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEntries)
    .where(eq(calendarEntries.dietLegacyId, legacyId));
  await db.delete(diets)
    .where(eq(diets.legacyId, legacyId));
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

export async function upsertCalendarEntryPublic(speciesId: string, dayKey: string, dietLegacyId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEntries)
    .where(and(
      eq(calendarEntries.speciesId, speciesId),
      eq(calendarEntries.dayKey, dayKey)
    ));
  await db.insert(calendarEntries).values({ userId: 0, speciesId, dayKey, dietLegacyId });
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

export async function removeCalendarEntryPublic(speciesId: string, dayKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEntries)
    .where(and(
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

export async function saveFullCalendarForSpeciesPublic(speciesId: string, calendarMap: Record<string, string>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(calendarEntries)
    .where(eq(calendarEntries.speciesId, speciesId));
  const entries = Object.entries(calendarMap).map(([dayKey, dietLegacyId]) => ({
    userId: 0,
    speciesId,
    dayKey,
    dietLegacyId,
  }));
  if (entries.length > 0) {
    await db.insert(calendarEntries).values(entries);
  }
}

// ===== MODULE ORDER =====

import { moduleOrder, topicComments, clients, clientPurchases, saleInstallments } from "../drizzle/schema";
import { asc, desc } from "drizzle-orm";

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

// ===== CLIENTS CRUD =====

import type { InsertClient, InsertClientPurchase, InsertSaleInstallment } from "../drizzle/schema";
import { plantel } from "../drizzle/schema";
import type { InsertPlantel } from "../drizzle/schema";

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).orderBy(asc(clients.name));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clients).values(client);
  return getClientById(result[0].insertId);
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(clients).set(data).where(eq(clients.id, id));
  return getClientById(id);
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete installments of all purchases, then purchases, then client
  const purchases = await db.select().from(clientPurchases).where(eq(clientPurchases.clientId, id));
  for (const p of purchases) {
    await db.delete(saleInstallments).where(eq(saleInstallments.purchaseId, p.id));
  }
  await db.delete(clientPurchases).where(eq(clientPurchases.clientId, id));
  await db.delete(clients).where(eq(clients.id, id));
  return true;
}

// ===== CLIENT PURCHASES CRUD =====

export async function getPurchasesByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clientPurchases)
    .where(eq(clientPurchases.clientId, clientId))
    .orderBy(desc(clientPurchases.saleDate));
}

export async function createPurchase(purchase: InsertClientPurchase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(clientPurchases).values(purchase);
  const rows = await db.select().from(clientPurchases).where(eq(clientPurchases.id, result[0].insertId)).limit(1);
  return rows[0];
}

export async function deletePurchase(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete installments first
  await db.delete(saleInstallments).where(eq(saleInstallments.purchaseId, id));
  await db.delete(clientPurchases).where(eq(clientPurchases.id, id));
  return true;
}

// ===== SALE INSTALLMENTS CRUD =====

export async function getInstallmentsByPurchase(purchaseId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(saleInstallments)
    .where(eq(saleInstallments.purchaseId, purchaseId))
    .orderBy(asc(saleInstallments.installmentNumber));
}

export async function createInstallments(installments: InsertSaleInstallment[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (installments.length === 0) return [];
  await db.insert(saleInstallments).values(installments);
  // Return all installments for the purchase
  return getInstallmentsByPurchase(installments[0].purchaseId);
}

export async function updateInstallmentStatus(id: number, status: "pendente" | "pago" | "atrasado", paidAt?: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const updateData: any = { status };
  if (status === "pago" && paidAt) {
    updateData.paidAt = paidAt;
  } else if (status !== "pago") {
    updateData.paidAt = null;
  }
  await db.update(saleInstallments).set(updateData).where(eq(saleInstallments.id, id));
  const rows = await db.select().from(saleInstallments).where(eq(saleInstallments.id, id)).limit(1);
  return rows[0];
}

// ===== PLANTEL CRUD =====

export async function getAllPlantel() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(plantel).orderBy(plantel.speciesName, plantel.ringNumber);
}

export async function getPlantelById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(plantel).where(eq(plantel.id, id)).limit(1);
  return rows[0] || null;
}

export async function createPlantelBird(data: Omit<InsertPlantel, "id" | "createdAt" | "updatedAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(plantel).values(data);
  const id = result[0].insertId;
  return getPlantelById(id);
}

export async function updatePlantelBird(id: number, data: Partial<Omit<InsertPlantel, "id" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(plantel).set(data).where(eq(plantel.id, id));
  return getPlantelById(id);
}

export async function deletePlantelBird(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(plantel).where(eq(plantel.id, id));
  return { success: true };
}

export async function getNextBirdNumber(speciesId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get all birds of this species and find the highest number
  const birds = await db.select({ ringNumber: plantel.ringNumber })
    .from(plantel)
    .where(eq(plantel.speciesId, speciesId));
  
  let maxNum = 0;
  for (const bird of birds) {
    if (bird.ringNumber) {
      // Extract numeric part (after the 2-letter prefix)
      const numPart = bird.ringNumber.replace(/^[A-Z]+/, "");
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return { nextNumber: String(maxNum + 1).padStart(3, "0") };
}

// ===== BIRD DOCUMENTS CRUD =====

import { birdDocuments } from "../drizzle/schema";
import type { InsertBirdDocument } from "../drizzle/schema";

export async function getDocumentsByBird(birdId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(birdDocuments).where(eq(birdDocuments.birdId, birdId)).orderBy(birdDocuments.createdAt);
}

export async function createBirdDocument(data: Omit<InsertBirdDocument, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(birdDocuments).values(data);
  const rows = await db.select().from(birdDocuments).where(eq(birdDocuments.id, result[0].insertId)).limit(1);
  return rows[0];
}

export async function deleteBirdDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(birdDocuments).where(eq(birdDocuments.id, id));
  return { success: true };
}
