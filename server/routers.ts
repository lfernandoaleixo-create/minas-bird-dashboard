import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
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
  getInstallmentsByPurchase,
  createInstallments,
  updateInstallmentStatus,
  getAllPlantel,
  getPlantelById,
  createPlantelBird,
  updatePlantelBird,
  deletePlantelBird,
  getNextBirdNumber,
  getDocumentsByBird,
  createBirdDocument,
  deleteBirdDocument,
  getAllFinancialTransactions,
  getFinancialTransactionById,
  createFinancialTransaction,
  updateFinancialTransaction,
  deleteFinancialTransaction,
} from "./db";
import {
  getFoodCalendarFoods,
  addFoodCalendarFood,
  removeFoodCalendarFood,
  getFoodCalendarChecks,
  setFoodCalendarCheck,
  getFoodCalendarSpeciesFoods,
  addFoodCalendarSpeciesFood,
  removeFoodCalendarSpeciesFood,
  getFoodCalendarSpeciesChecks,
  setFoodCalendarSpeciesCheck,
  getFoodCalendarSpeciesPhases,
  setFoodCalendarSpeciesPhase,
  getDietCalcConfigs,
  setDietCalcConfig,
  getTopicOrders,
  setTopicOrder,
} from "./dbShared";

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
        // Attach installments to each purchase
        const purchasesWithInstallments = await Promise.all(
          purchases.map(async (p) => {
            const parcelas = await getInstallmentsByPurchase(p.id);
            return { ...p, parcelas };
          })
        );
        return { ...client, purchases: purchasesWithInstallments };
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
    /** Listar compras de um cliente (com parcelas) */
    listByClient: publicProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const purchases = await getPurchasesByClient(input.clientId);
        // Attach installments to each purchase
        const result = await Promise.all(
          purchases.map(async (p) => {
            const installments = await getInstallmentsByPurchase(p.id);
            return { ...p, installments };
          })
        );
        return result;
      }),

    /** Registrar nova venda com forma de pagamento e parcelas */
    create: publicProcedure
      .input(z.object({
        clientId: z.number(),
        species: z.string().min(1),
        quantity: z.number().int().min(1),
        valueCents: z.number().int().nullable().optional(),
        paymentMethod: z.enum(["pix", "dinheiro", "cartao_debito", "cartao_credito", "boleto", "transferencia"]).nullable().optional(),
        installmentsCount: z.number().int().min(1).max(12).optional().default(1),
        invoiceNumber: z.string().nullable().optional(),
        saleDate: z.string(), // ISO date string
        notes: z.string().nullable().optional(),
        /** Array de parcelas com valor e vencimento */
        installments: z.array(z.object({
          valueCents: z.number().int(),
          dueDate: z.string(), // ISO date string
        })).optional(),
      }))
      .mutation(async ({ input }) => {
        const purchase = await createPurchase({
          clientId: input.clientId,
          species: input.species,
          quantity: input.quantity,
          valueCents: input.valueCents ?? null,
          paymentMethod: input.paymentMethod ?? null,
          installments: input.installmentsCount,
          invoiceNumber: input.invoiceNumber ?? null,
          saleDate: new Date(input.saleDate),
          notes: input.notes ?? null,
        });
        // Create installments if provided
        let createdInstallments: any[] = [];
        if (input.installments && input.installments.length > 0 && purchase) {
          const installmentData = input.installments.map((inst, idx) => ({
            purchaseId: purchase.id,
            installmentNumber: idx + 1,
            valueCents: inst.valueCents,
            dueDate: new Date(inst.dueDate),
            status: "pendente" as const,
          }));
          createdInstallments = await createInstallments(installmentData);
        }
        // Auto-link: create a Caixa entry for this sale
        if (purchase && input.valueCents && input.valueCents > 0) {
          await createFinancialTransaction({
            type: "venda",
            category: "Venda de Ave",
            description: `Venda: ${input.species} (${input.quantity}x) — Cliente #${input.clientId}`,
            valueCents: input.valueCents,
            transactionDate: new Date(input.saleDate),
            paymentMethod: input.paymentMethod ?? null,
            reference: input.invoiceNumber ? `NF ${input.invoiceNumber}` : `Venda #${purchase.id}`,
            notes: input.notes ?? null,
          });
        }
        return { success: true, purchase: purchase ? { ...purchase, installments: createdInstallments } : null };
      }),

    /** Deletar compra (e suas parcelas) */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deletePurchase(input.id);
        return { success: true };
      }),

    /** Atualizar status de uma parcela */
    updateInstallment: publicProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pendente", "pago", "atrasado"]),
        paidAt: z.string().nullable().optional(), // ISO date string
      }))
      .mutation(async ({ input }) => {
        const paidAt = input.paidAt ? new Date(input.paidAt) : undefined;
        const installment = await updateInstallmentStatus(input.id, input.status, paidAt);
        return { success: true, installment };
      }),

    /** Listar parcelas de uma compra */
    getInstallments: publicProcedure
      .input(z.object({ purchaseId: z.number() }))
      .query(async ({ input }) => {
        return getInstallmentsByPurchase(input.purchaseId);
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

  // ═══════════════════════════════════════════════════════════
  // FOOD CALENDAR — Shared data (Alimentação Teste)
  // ═══════════════════════════════════════════════════════════
  foodCalendar: router({
    /** Get all foods in the general calendar tables */
    getFoods: publicProcedure.query(async () => {
      return getFoodCalendarFoods();
    }),

    /** Add a food to the general calendar */
    addFood: publicProcedure
      .input(z.object({ name: z.string(), category: z.string(), quality: z.string() }))
      .mutation(async ({ input }) => {
        await addFoodCalendarFood(input.name, input.category, input.quality);
        return { success: true };
      }),

    /** Remove a food from the general calendar */
    removeFood: publicProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input }) => {
        await removeFoodCalendarFood(input.name);
        return { success: true };
      }),

    /** Get all checks (general) */
    getChecks: publicProcedure.query(async () => {
      const rows = await getFoodCalendarChecks();
      const result: Record<string, boolean> = {};
      for (const row of rows) {
        result[row.checkKey] = true;
      }
      return result;
    }),

    /** Set/unset a check */
    setCheck: publicProcedure
      .input(z.object({ checkKey: z.string(), checked: z.boolean() }))
      .mutation(async ({ input }) => {
        await setFoodCalendarCheck(input.checkKey, input.checked);
        return { success: true };
      }),

    /** Get all species foods */
    getSpeciesFoods: publicProcedure.query(async () => {
      const rows = await getFoodCalendarSpeciesFoods();
      const result: Record<string, Array<{ name: string; category: string; quality: string }>> = {};
      for (const row of rows) {
        if (!result[row.speciesId]) result[row.speciesId] = [];
        result[row.speciesId].push({ name: row.name, category: row.category, quality: row.quality });
      }
      return result;
    }),

    /** Add a species food */
    addSpeciesFood: publicProcedure
      .input(z.object({ speciesId: z.string(), name: z.string(), category: z.string(), quality: z.string() }))
      .mutation(async ({ input }) => {
        await addFoodCalendarSpeciesFood(input.speciesId, input.name, input.category, input.quality);
        return { success: true };
      }),

    /** Remove a species food */
    removeSpeciesFood: publicProcedure
      .input(z.object({ speciesId: z.string(), name: z.string() }))
      .mutation(async ({ input }) => {
        await removeFoodCalendarSpeciesFood(input.speciesId, input.name);
        return { success: true };
      }),

    /** Get all species checks */
    getSpeciesChecks: publicProcedure.query(async () => {
      const rows = await getFoodCalendarSpeciesChecks();
      const result: Record<string, Record<string, boolean>> = {};
      for (const row of rows) {
        if (!result[row.speciesId]) result[row.speciesId] = {};
        result[row.speciesId][row.checkKey] = true;
      }
      return result;
    }),

    /** Set/unset a species check */
    setSpeciesCheck: publicProcedure
      .input(z.object({ speciesId: z.string(), checkKey: z.string(), checked: z.boolean() }))
      .mutation(async ({ input }) => {
        await setFoodCalendarSpeciesCheck(input.speciesId, input.checkKey, input.checked);
        return { success: true };
      }),

    /** Get all species phases */
    getSpeciesPhases: publicProcedure.query(async () => {
      const rows = await getFoodCalendarSpeciesPhases();
      const result: Record<string, string> = {};
      for (const row of rows) {
        result[row.speciesId] = row.phaseId;
      }
      return result;
    }),

    /** Set species phase */
    setSpeciesPhase: publicProcedure
      .input(z.object({ speciesId: z.string(), phaseId: z.string() }))
      .mutation(async ({ input }) => {
        await setFoodCalendarSpeciesPhase(input.speciesId, input.phaseId);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // DIET CALCULATOR CONFIG — Shared
  // ═══════════════════════════════════════════════════════════
  dietCalc: router({
    /** Get all diet calc configs */
    getAll: publicProcedure.query(async () => {
      const rows = await getDietCalcConfigs();
      const result: Record<string, { racaoId: string | null; racaoPct: number; enclosureMultiplierX100: number }> = {};
      for (const row of rows) {
        result[row.speciesId] = {
          racaoId: row.racaoId,
          racaoPct: row.racaoPct,
          enclosureMultiplierX100: row.enclosureMultiplierX100,
        };
      }
      return result;
    }),

    /** Save diet calc config for a species */
    save: publicProcedure
      .input(z.object({
        speciesId: z.string(),
        racaoId: z.string().nullable(),
        racaoPct: z.number().min(50).max(100),
        enclosureMultiplierX100: z.number().min(50).max(300),
      }))
      .mutation(async ({ input }) => {
        await setDietCalcConfig(input.speciesId, input.racaoId, input.racaoPct, input.enclosureMultiplierX100);
        return { success: true };
      }),
  }),

  // ═══════════════════════════════════════════════════════════
  // TOPIC ORDER — Shared (Progress Map)
  // ═══════════════════════════════════════════════════════════
  topicOrderRouter: router({
    /** Get all topic orders */
    getAll: publicProcedure.query(async () => {
      const rows = await getTopicOrders();
      const result: Record<string, number[]> = {};
      for (const row of rows) {
        result[row.moduleId] = row.orderJson;
      }
      return result;
    }),

    /** Save topic order for a module */
    save: publicProcedure
      .input(z.object({
        moduleId: z.string(),
        orderJson: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        await setTopicOrder(input.moduleId, input.orderJson);
        return { success: true };
      }),
    }),

  // ===== PLANTEL =====
  plantel: router({
    /** List all birds in the plantel */
    list: publicProcedure.query(async () => {
      return getAllPlantel();
    }),

    /** Get a single bird by ID */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getPlantelById(input.id);
      }),

    /** Create a new bird */
    create: publicProcedure
      .input(z.object({
        speciesId: z.string(),
        speciesName: z.string(),
        ringNumber: z.string().nullable().optional(),
        anilha: z.string().nullable().optional(),
        sex: z.enum(["macho", "femea", "indefinido"]).default("indefinido"),
        birthDate: z.date().nullable().optional(),
        mutation: z.string().nullable().optional(),
        origin: z.enum(["nascido_criadouro", "comprado", "doado", "troca"]).default("nascido_criadouro"),
        originBreeder: z.string().nullable().optional(),
        status: z.enum(["ativo", "vendido", "obito", "doado", "emprestado"]).default("ativo"),
        enclosure: z.string().nullable().optional(),
        weightGrams: z.number().nullable().optional(),
        fatherId: z.number().nullable().optional(),
        motherId: z.number().nullable().optional(),
        invoiceNumber: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return createPlantelBird(input);
      }),

    /** Update an existing bird */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        speciesId: z.string().optional(),
        speciesName: z.string().optional(),
        ringNumber: z.string().nullable().optional(),
        anilha: z.string().nullable().optional(),
        sex: z.enum(["macho", "femea", "indefinido"]).optional(),
        birthDate: z.date().nullable().optional(),
        mutation: z.string().nullable().optional(),
        origin: z.enum(["nascido_criadouro", "comprado", "doado", "troca"]).optional(),
        originBreeder: z.string().nullable().optional(),
        status: z.enum(["ativo", "vendido", "obito", "doado", "emprestado"]).optional(),
        enclosure: z.string().nullable().optional(),
        weightGrams: z.number().nullable().optional(),
        fatherId: z.number().nullable().optional(),
        motherId: z.number().nullable().optional(),
        invoiceNumber: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updatePlantelBird(id, data);
      }),

    /** Get the next available number for a species */
    nextNumber: publicProcedure
      .input(z.object({ speciesId: z.string() }))
      .query(async ({ input }) => {
        return getNextBirdNumber(input.speciesId);
      }),

    /** Delete a bird */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deletePlantelBird(input.id);
      }),

    /** Get documents for a bird */
    getDocuments: publicProcedure
      .input(z.object({ birdId: z.number() }))
      .query(async ({ input }) => {
        return getDocumentsByBird(input.birdId);
      }),

    /** Upload a document for a bird */
    addDocument: publicProcedure
      .input(z.object({
        birdId: z.number(),
        docType: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        mimeType: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return createBirdDocument(input);
      }),

    /** Upload a document file to S3 and save metadata */
    uploadDocument: publicProcedure
      .input(z.object({
        birdId: z.number(),
        docType: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        fileBase64: z.string(), // base64-encoded file content
      }))
      .mutation(async ({ input }) => {
        // Decode base64 to buffer
        const buffer = Buffer.from(input.fileBase64, "base64");
        // Generate unique key
        const suffix = Math.random().toString(36).substring(2, 10);
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `plantel-docs/${input.birdId}/${suffix}-${safeFileName}`;
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        // Save metadata in DB
        return createBirdDocument({
          birdId: input.birdId,
          docType: input.docType,
          fileName: input.fileName,
          fileUrl: url,
          fileKey,
          mimeType: input.mimeType,
        });
      }),

    /** Delete a document */
    deleteDocument: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteBirdDocument(input.id);
      }),
  }),

  // ===== CAIXA (FINANCEIRO) =====
  caixa: router({
    /** List all financial transactions */
    list: publicProcedure.query(async () => {
      return getAllFinancialTransactions();
    }),

    /** Get a single transaction by ID */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getFinancialTransactionById(input.id);
      }),

    /** Create a new financial transaction */
    create: publicProcedure
      .input(z.object({
        type: z.enum(["aporte", "venda", "despesa"]),
        category: z.string(),
        description: z.string().nullable().optional(),
        valueCents: z.number().min(1),
        transactionDate: z.date(),
        paymentMethod: z.string().nullable().optional(),
        reference: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        return createFinancialTransaction(input);
      }),

    /** Update an existing transaction */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        type: z.enum(["aporte", "venda", "despesa"]).optional(),
        category: z.string().optional(),
        description: z.string().nullable().optional(),
        valueCents: z.number().min(1).optional(),
        transactionDate: z.date().optional(),
        paymentMethod: z.string().nullable().optional(),
        reference: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateFinancialTransaction(id, data);
      }),

    /** Delete a transaction */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteFinancialTransaction(input.id);
      }),
  }),
});
export type AppRouter = typeof appRouter;
