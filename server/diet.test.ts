import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("diet routes", () => {
  it("list returns an array", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.diet.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("create and then list returns the diet", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testId = `test-${Date.now()}`;
    const createResult = await caller.diet.create({
      id: testId,
      name: "Dieta Teste Vitest",
      speciesId: "ringneck",
      speciesName: "Ringneck",
      racaoId: "racao-1",
      racaoName: "Ração Teste",
      vegetaisIds: ["veg-1"],
      frutasIds: ["fruta-1"],
      proteicosIds: [],
      weight: 120,
      phaseId: "adult",
      enclosureId: "enc-1",
      birdCount: 1,
      mer: 25.5,
      totalGrams: 30.2,
      totalKcal: 25.5,
      items: {
        racao: [{ foodId: "racao-1", foodName: "Ração Teste", grams: 15, kcal: 12, energyKcalPerKg: 3200 }],
        vegetais: [{ foodId: "veg-1", foodName: "Couve", grams: 10, kcal: 3, energyKcalPerKg: 300 }],
        frutas: [{ foodId: "fruta-1", foodName: "Maçã", grams: 5, kcal: 2.5, energyKcalPerKg: 520 }],
        proteicos: [],
      },
    });

    expect(createResult.success).toBe(true);

    const list = await caller.diet.list();
    const found = list.find(d => d.id === testId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Dieta Teste Vitest");
    expect(found!.speciesName).toBe("Ringneck");

    // Cleanup
    await caller.diet.delete({ id: testId });
  });

  it("delete removes the diet", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const testId = `test-del-${Date.now()}`;
    await caller.diet.create({
      id: testId,
      name: "Dieta Para Deletar",
      speciesId: "calopsita",
      speciesName: "Calopsita",
      racaoId: "racao-2",
      racaoName: "Ração Calopsita",
      vegetaisIds: [],
      frutasIds: [],
      proteicosIds: [],
      weight: 90,
      phaseId: "adult",
      enclosureId: "enc-2",
      birdCount: 1,
      mer: 18,
      totalGrams: 20,
      totalKcal: 18,
      items: {
        racao: [{ foodId: "racao-2", foodName: "Ração Calopsita", grams: 20, kcal: 18, energyKcalPerKg: 3000 }],
        vegetais: [],
        frutas: [],
        proteicos: [],
      },
    });

    const deleteResult = await caller.diet.delete({ id: testId });
    expect(deleteResult.success).toBe(true);

    const list = await caller.diet.list();
    const found = list.find(d => d.id === testId);
    expect(found).toBeUndefined();
  });
});

describe("calendar routes", () => {
  it("getAll returns an object", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.getAll();
    expect(typeof result).toBe("object");
  });

  it("assignDay and removeDay work correctly", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const speciesId = "ringneck";
    const dayKey = "2026-04-15";
    const dietId = "test-diet-cal";

    // Assign
    const assignResult = await caller.calendar.assignDay({ speciesId, dayKey, dietId });
    expect(assignResult.success).toBe(true);

    // Verify
    const cal = await caller.calendar.getAll();
    expect(cal[speciesId]?.[dayKey]).toBe(dietId);

    // Remove
    const removeResult = await caller.calendar.removeDay({ speciesId, dayKey });
    expect(removeResult.success).toBe(true);

    // Verify removed
    const cal2 = await caller.calendar.getAll();
    expect(cal2[speciesId]?.[dayKey]).toBeUndefined();
  });
});
