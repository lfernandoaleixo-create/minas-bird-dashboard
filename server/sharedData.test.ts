/**
 * Tests for shared data routes: foodCalendar, dietCalc, topicOrderRouter
 * These routes are all public (no auth required) and shared between all users
 * Uses superjson transport format (input wrapped in {json:...}, output in result.data.json)
 */
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3000/api/trpc";

async function trpcQuery(path: string) {
  const res = await fetch(`${BASE}/${path}`, { method: "GET" });
  const json = await res.json();
  return json.result?.data?.json;
}

async function trpcMutation(path: string, input: any) {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: input }),
  });
  const json = await res.json();
  return json.result?.data?.json;
}

describe("foodCalendar routes", () => {
  it("getFoods returns an array", async () => {
    const data = await trpcQuery("foodCalendar.getFoods");
    expect(Array.isArray(data)).toBe(true);
  });

  it("addFood adds a food and getFoods returns it", async () => {
    const testFood = `test-food-${Date.now()}`;
    const result = await trpcMutation("foodCalendar.addFood", { name: testFood, category: "vegetais", quality: "bom" });
    expect(result.success).toBe(true);

    const foods = await trpcQuery("foodCalendar.getFoods");
    expect(foods.some((f: any) => f.name === testFood)).toBe(true);

    // Cleanup
    await trpcMutation("foodCalendar.removeFood", { name: testFood });
  });

  it("removeFood removes a food", async () => {
    const testFood = `test-remove-${Date.now()}`;
    await trpcMutation("foodCalendar.addFood", { name: testFood, category: "frutas", quality: "excelente" });
    await trpcMutation("foodCalendar.removeFood", { name: testFood });

    const foods = await trpcQuery("foodCalendar.getFoods");
    expect(foods.some((f: any) => f.name === testFood)).toBe(false);
  });

  it("getChecks returns an object", async () => {
    const data = await trpcQuery("foodCalendar.getChecks");
    expect(typeof data).toBe("object");
  });

  it("setCheck sets and unsets a check", async () => {
    const key = `2026-05|test-food-check-${Date.now()}|15`;
    await trpcMutation("foodCalendar.setCheck", { checkKey: key, checked: true });

    let checks = await trpcQuery("foodCalendar.getChecks");
    expect(checks[key]).toBe(true);

    await trpcMutation("foodCalendar.setCheck", { checkKey: key, checked: false });
    checks = await trpcQuery("foodCalendar.getChecks");
    expect(checks[key]).toBeUndefined();
  });

  it("getSpeciesFoods returns an object", async () => {
    const data = await trpcQuery("foodCalendar.getSpeciesFoods");
    expect(typeof data).toBe("object");
  });

  it("addSpeciesFood and removeSpeciesFood work", async () => {
    const speciesId = `test-sp-food-${Date.now()}`;
    const name = `sp-food-${Date.now()}`;
    await trpcMutation("foodCalendar.addSpeciesFood", { speciesId, name, category: "sementes", quality: "pobre" });

    let specFoods = await trpcQuery("foodCalendar.getSpeciesFoods");
    expect(specFoods[speciesId]?.some((f: any) => f.name === name)).toBe(true);

    await trpcMutation("foodCalendar.removeSpeciesFood", { speciesId, name });
    specFoods = await trpcQuery("foodCalendar.getSpeciesFoods");
    const remaining = specFoods[speciesId] || [];
    expect(remaining.some((f: any) => f.name === name)).toBe(false);
  });

  it("getSpeciesChecks returns an object", async () => {
    const data = await trpcQuery("foodCalendar.getSpeciesChecks");
    expect(typeof data).toBe("object");
  });

  it("setSpeciesCheck sets and unsets", async () => {
    const speciesId = `test-sp-check-${Date.now()}`;
    const key = `2026-05|test-sp-food|10`;
    await trpcMutation("foodCalendar.setSpeciesCheck", { speciesId, checkKey: key, checked: true });

    let checks = await trpcQuery("foodCalendar.getSpeciesChecks");
    expect(checks[speciesId]?.[key]).toBe(true);

    await trpcMutation("foodCalendar.setSpeciesCheck", { speciesId, checkKey: key, checked: false });
    checks = await trpcQuery("foodCalendar.getSpeciesChecks");
    expect(checks[speciesId]?.[key]).toBeUndefined();
  });

  it("getSpeciesPhases returns an object", async () => {
    const data = await trpcQuery("foodCalendar.getSpeciesPhases");
    expect(typeof data).toBe("object");
  });

  it("setSpeciesPhase sets a phase", async () => {
    const speciesId = `test-phase-${Date.now()}`;
    await trpcMutation("foodCalendar.setSpeciesPhase", { speciesId, phaseId: "manutencao" });

    const phases = await trpcQuery("foodCalendar.getSpeciesPhases");
    expect(phases[speciesId]).toBe("manutencao");
  });
});

describe("dietCalc routes", () => {
  it("getAll returns an object", async () => {
    const data = await trpcQuery("dietCalc.getAll");
    expect(typeof data).toBe("object");
  });

  it("save stores config and getAll returns it", async () => {
    const speciesId = `test-diet-${Date.now()}`;
    await trpcMutation("dietCalc.save", {
      speciesId,
      racaoId: "racao-premium",
      racaoPct: 80,
      enclosureMultiplierX100: 120,
    });

    const all = await trpcQuery("dietCalc.getAll");
    expect(all[speciesId]).toBeDefined();
    expect(all[speciesId].racaoId).toBe("racao-premium");
    expect(all[speciesId].racaoPct).toBe(80);
    expect(all[speciesId].enclosureMultiplierX100).toBe(120);
  });
});

describe("topicOrderRouter routes", () => {
  it("getAll returns an object", async () => {
    const data = await trpcQuery("topicOrderRouter.getAll");
    expect(typeof data).toBe("object");
  });

  it("save stores order and getAll returns it", async () => {
    const moduleId = `test-module-${Date.now()}`;
    const order = [2, 0, 1, 3];
    await trpcMutation("topicOrderRouter.save", { moduleId, orderJson: order });

    const all = await trpcQuery("topicOrderRouter.getAll");
    expect(all[moduleId]).toEqual(order);
  });
});
