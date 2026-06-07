import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";

const ctx = { user: null, req: {} as any, res: { clearCookie: () => {} } as any };
const caller = appRouter.createCaller(ctx);

describe("caixa router", () => {
  let createdId: number | null = null;

  it("list returns an array", async () => {
    const result = await caller.caixa.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a financial transaction (despesa)", async () => {
    const result = await caller.caixa.create({
      type: "despesa",
      category: "Ração",
      description: "Compra de ração Megazoo 5kg",
      valueCents: 15000,
      transactionDate: new Date("2026-06-01T12:00:00Z"),
      paymentMethod: "pix",
      reference: "Fornecedor ABC",
      notes: "Entrega programada",
    });
    expect(result).toBeTruthy();
    expect(result!.type).toBe("despesa");
    expect(result!.category).toBe("Ração");
    expect(result!.valueCents).toBe(15000);
    createdId = result!.id;
  });

  it("creates a financial transaction (aporte)", async () => {
    const result = await caller.caixa.create({
      type: "aporte",
      category: "Investimento Pessoal",
      description: "Capital inicial mês de junho",
      valueCents: 500000,
      transactionDate: new Date("2026-06-01T12:00:00Z"),
    });
    expect(result).toBeTruthy();
    expect(result!.type).toBe("aporte");
    expect(result!.valueCents).toBe(500000);
    // Clean up
    if (result!.id) await caller.caixa.delete({ id: result!.id });
  });

  it("creates a financial transaction (venda)", async () => {
    const result = await caller.caixa.create({
      type: "venda",
      category: "Venda de Ave",
      description: "Ringneck Lutino para cliente João",
      valueCents: 250000,
      transactionDate: new Date("2026-06-05T12:00:00Z"),
      paymentMethod: "pix",
      reference: "Cliente João Silva",
    });
    expect(result).toBeTruthy();
    expect(result!.type).toBe("venda");
    expect(result!.valueCents).toBe(250000);
    // Clean up
    if (result!.id) await caller.caixa.delete({ id: result!.id });
  });

  it("gets a transaction by ID", async () => {
    if (!createdId) return;
    const result = await caller.caixa.getById({ id: createdId });
    expect(result).toBeTruthy();
    expect(result!.id).toBe(createdId);
    expect(result!.description).toBe("Compra de ração Megazoo 5kg");
  });

  it("updates a transaction", async () => {
    if (!createdId) return;
    const result = await caller.caixa.update({
      id: createdId,
      description: "Compra de ração Megazoo 10kg",
      valueCents: 28000,
    });
    expect(result).toBeTruthy();
    expect(result!.description).toBe("Compra de ração Megazoo 10kg");
    expect(result!.valueCents).toBe(28000);
  });

  it("deletes a transaction", async () => {
    if (!createdId) return;
    const result = await caller.caixa.delete({ id: createdId });
    expect(result).toEqual({ success: true });
    // Verify it's gone
    const check = await caller.caixa.getById({ id: createdId });
    expect(check).toBeNull();
  });
});
