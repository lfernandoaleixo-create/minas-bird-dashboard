import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getDietsByUser,
  getAllDiets,
  createDiet,
  updateDietByLegacyIdPublic,
  deleteDietByLegacyIdPublic,
  getCalendarByUser,
  getAllCalendarEntries,
  upsertCalendarEntryPublic,
  removeCalendarEntryPublic,
  saveFullCalendarForSpeciesPublic,
  getModuleOrder,
  saveModuleOrder,
  getAllTopicComments,
  upsertTopicComment,
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getPurchasesByClient,
  createPurchase,
  deletePurchase,
} from "./db";

// Schema para itens de dieta
const dietItemSchema = z.object({
  foodId: z.string(),
  foodName: z.string(),
  grams: z.number(),
  kcal: z.number(),
  energyKcalPerKg: z.number(),
});

const dietItemsSchema = z.object({
  racao: z.array(dietItemSchema),
  vegetais: z.array(dietItemSchema),
  frutas: z.array(dietItemSchema),
  proteicos: z.array(dietItemSchema),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ===== DIETAS =====
  diet: router({
    /** Listar todas as dietas (público, sem exigir login) */
    list: publicProcedure.query(async () => {
      const rows = await getAllDiets();
      return rows.map(row => ({
        id: row.legacyId,
        name: row.name,
        speciesId: row.speciesId,
        speciesName: row.speciesName,
        racaoId: row.racaoId,
        racaoName: row.racaoName,
        racao2Id: row.racao2Id ?? null,
        racao2Name: row.racao2Name ?? null,
        racao1Pct: row.racao1Pct ?? 100,
        vegetaisIds: row.vegetaisIds,
        frutasIds: row.frutasIds,
        proteicosIds: row.proteicosIds,
        weight: row.weight,
        phaseId: row.phaseId,
        enclosureId: row.enclosureId,
        birdCount: row.birdCount,
        notes: row.notes ?? "",
        color: row.color ?? "",
        mer: row.merX10 / 10,
        totalGrams: row.totalGramsX10 / 10,
        totalKcal: row.totalKcalX10 / 10,
        items: row.items,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      }));
    }),

    /** Criar nova dieta (público) */
    create: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1),
        speciesId: z.string(),
        speciesName: z.string(),
        racaoId: z.string(),
        racaoName: z.string(),
        racao2Id: z.string().nullable().optional(),
        racao2Name: z.string().nullable().optional(),
        racao1Pct: z.number().int().min(25).max(100).optional(),
        vegetaisIds: z.array(z.string()),
        frutasIds: z.array(z.string()),
        proteicosIds: z.array(z.string()),
        weight: z.number(),
        phaseId: z.string(),
        enclosureId: z.string(),
        birdCount: z.number().int().min(1),
        notes: z.string().optional(),
        color: z.string().optional(),
        mer: z.number(),
        totalGrams: z.number(),
        totalKcal: z.number(),
        items: dietItemsSchema,
      }))
      .mutation(async ({ input }) => {
        const diet = await createDiet({
          legacyId: input.id,
          userId: 0,
          name: input.name,
          speciesId: input.speciesId,
          speciesName: input.speciesName,
          racaoId: input.racaoId,
          racaoName: input.racaoName,
          racao2Id: input.racao2Id ?? null,
          racao2Name: input.racao2Name ?? null,
          racao1Pct: input.racao1Pct ?? 100,
          vegetaisIds: input.vegetaisIds,
          frutasIds: input.frutasIds,
          proteicosIds: input.proteicosIds,
          weight: input.weight,
          phaseId: input.phaseId,
          enclosureId: input.enclosureId,
          birdCount: input.birdCount,
          notes: input.notes ?? null,
          color: input.color ?? null,
          merX10: Math.round(input.mer * 10),
          totalGramsX10: Math.round(input.totalGrams * 10),
          totalKcalX10: Math.round(input.totalKcal * 10),
          items: input.items,
        });
        return { success: true, diet };
      }),

    /** Atualizar dieta existente (público) */
    update: publicProcedure
      .input(z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        racaoId: z.string().optional(),
        racaoName: z.string().optional(),
        racao2Id: z.string().nullable().optional(),
        racao2Name: z.string().nullable().optional(),
        racao1Pct: z.number().int().min(25).max(100).optional(),
        vegetaisIds: z.array(z.string()).optional(),
        frutasIds: z.array(z.string()).optional(),
        proteicosIds: z.array(z.string()).optional(),
        weight: z.number().optional(),
        phaseId: z.string().optional(),
        enclosureId: z.string().optional(),
        birdCount: z.number().int().min(1).optional(),
        notes: z.string().optional(),
        color: z.string().optional(),
        mer: z.number().optional(),
        totalGrams: z.number().optional(),
        totalKcal: z.number().optional(),
        items: dietItemsSchema.optional(),
      }))
      .mutation(async ({ input }) => {
        const data: Record<string, unknown> = {};
        if (input.name !== undefined) data.name = input.name;
        if (input.racaoId !== undefined) data.racaoId = input.racaoId;
        if (input.racaoName !== undefined) data.racaoName = input.racaoName;
        if (input.racao2Id !== undefined) data.racao2Id = input.racao2Id;
        if (input.racao2Name !== undefined) data.racao2Name = input.racao2Name;
        if (input.racao1Pct !== undefined) data.racao1Pct = input.racao1Pct;
        if (input.vegetaisIds !== undefined) data.vegetaisIds = input.vegetaisIds;
        if (input.frutasIds !== undefined) data.frutasIds = input.frutasIds;
        if (input.proteicosIds !== undefined) data.proteicosIds = input.proteicosIds;
        if (input.weight !== undefined) data.weight = input.weight;
        if (input.phaseId !== undefined) data.phaseId = input.phaseId;
        if (input.enclosureId !== undefined) data.enclosureId = input.enclosureId;
        if (input.birdCount !== undefined) data.birdCount = input.birdCount;
        if (input.notes !== undefined) data.notes = input.notes || null;
        if (input.color !== undefined) data.color = input.color || null;
        if (input.mer !== undefined) data.merX10 = Math.round(input.mer * 10);
        if (input.totalGrams !== undefined) data.totalGramsX10 = Math.round(input.totalGrams * 10);
        if (input.totalKcal !== undefined) data.totalKcalX10 = Math.round(input.totalKcal * 10);
        if (input.items !== undefined) data.items = input.items;

        const diet = await updateDietByLegacyIdPublic(input.id, data);
        return { success: true, diet };
      }),

    /** Deletar dieta (público) */
    delete: publicProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await deleteDietByLegacyIdPublic(input.id);
        return { success: true };
      }),
  }),

  // ===== CALENDÁRIO =====
  calendar: router({
    /** Obter todo o calendário (público, sem exigir login) */
    getAll: publicProcedure.query(async () => {
      const rows = await getAllCalendarEntries();
      // Converter para formato { speciesId: { dayKey: dietLegacyId } }
      const result: Record<string, Record<string, string>> = {};
      for (const row of rows) {
        if (!result[row.speciesId]) result[row.speciesId] = {};
        result[row.speciesId][row.dayKey] = row.dietLegacyId;
      }
      return result;
    }),

    /** Atribuir dieta a um dia (público) */
    assignDay: publicProcedure
      .input(z.object({
        speciesId: z.string(),
        dayKey: z.string(),
        dietId: z.string(),
      }))
      .mutation(async ({ input }) => {
        await upsertCalendarEntryPublic(input.speciesId, input.dayKey, input.dietId);
        return { success: true };
      }),

    /** Remover dieta de um dia (público) */
    removeDay: publicProcedure
      .input(z.object({
        speciesId: z.string(),
        dayKey: z.string(),
      }))
      .mutation(async ({ input }) => {
        await removeCalendarEntryPublic(input.speciesId, input.dayKey);
        return { success: true };
      }),

    /** Salvar calendário completo de uma espécie (público) */
    saveForSpecies: publicProcedure
      .input(z.object({
        speciesId: z.string(),
        calendar: z.record(z.string(), z.string()),
      }))
      .mutation(async ({ input }) => {
        await saveFullCalendarForSpeciesPublic(input.speciesId, input.calendar);
        return { success: true };
      }),
  }),

  // ===== MODULE ORDER =====
  moduleOrder: router({
    /** Obter ordem dos módulos */
    get: publicProcedure.query(async () => {
      const rows = await getModuleOrder();
      return rows.map(r => r.moduleId);
    }),

    /** Salvar nova ordem dos módulos */
    save: publicProcedure
      .input(z.object({
        moduleIds: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        await saveModuleOrder(input.moduleIds);
        return { success: true };
      }),
  }),

  // ===== CLIENTES =====
  cliente: router({
    /** Listar todos os clientes */
    list: publicProcedure.query(async () => {
      return getAllClients();
    }),

    /** Obter cliente por ID com histórico de compras */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const client = await getClientById(input.id);
        if (!client) return null;
        const purchases = await getPurchasesByClient(input.id);
        return { ...client, purchases };
      }),

    /** Criar novo cliente */
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        phone: z.string().min(1),
        phone2: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        cpf: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        cep: z.string().nullable().optional(),
        speciesInterest: z.array(z.string()).nullable().optional(),
        referralSource: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(["ativo", "inativo", "lista_espera"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const client = await createClient({
          name: input.name,
          phone: input.phone,
          phone2: input.phone2 ?? null,
          email: input.email ?? null,
          cpf: input.cpf ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          cep: input.cep ?? null,
          speciesInterest: input.speciesInterest ?? null,
          referralSource: input.referralSource ?? null,
          notes: input.notes ?? null,
          status: input.status ?? "ativo",
        });
        return { success: true, client };
      }),

    /** Atualizar cliente */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        phone: z.string().min(1).optional(),
        phone2: z.string().nullable().optional(),
        email: z.string().nullable().optional(),
        cpf: z.string().nullable().optional(),
        address: z.string().nullable().optional(),
        city: z.string().nullable().optional(),
        state: z.string().nullable().optional(),
        cep: z.string().nullable().optional(),
        speciesInterest: z.array(z.string()).nullable().optional(),
        referralSource: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
        status: z.enum(["ativo", "inativo", "lista_espera"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const client = await updateClient(id, data as any);
        return { success: true, client };
      }),

    /** Deletar cliente */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteClient(input.id);
        return { success: true };
      }),
  }),

  // ===== COMPRAS DE CLIENTES =====
  purchase: router({
    /** Listar compras de um cliente */
    listByClient: publicProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return getPurchasesByClient(input.clientId);
      }),

    /** Registrar nova compra */
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        species: z.string().min(1),
        quantity: z.number().int().min(1),
        valueCents: z.number().int().nullable().optional(),
        invoiceNumber: z.string().nullable().optional(),
        saleDate: z.string(), // ISO date string
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const purchase = await createPurchase({
          clientId: input.clientId,
          species: input.species,
          quantity: input.quantity,
          valueCents: input.valueCents ?? null,
          invoiceNumber: input.invoiceNumber ?? null,
          saleDate: new Date(input.saleDate),
          notes: input.notes ?? null,
        });
        return { success: true, purchase };
      }),

    /** Deletar compra */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePurchase(input.id);
        return { success: true };
      }),
  }),

  // ===== TOPIC COMMENTS =====
  topicComment: router({
    /** Obter todos os comentários de tópicos */
    getAll: publicProcedure.query(async () => {
      const rows = await getAllTopicComments();
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.topicKey] = row.comment;
      }
      return result;
    }),

    /** Salvar/atualizar comentário de um tópico */
    save: publicProcedure
      .input(z.object({
        topicKey: z.string().min(1),
        comment: z.string(),
      }))
      .mutation(async ({ input }) => {
        await upsertTopicComment(input.topicKey, input.comment);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
