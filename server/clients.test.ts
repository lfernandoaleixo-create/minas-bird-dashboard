import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("cliente router", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  let createdClientId: number;

  it("lists clients (initially may be empty or have test data)", async () => {
    const result = await caller.cliente.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a new client with required fields", async () => {
    const result = await caller.cliente.create({
      name: "Cliente Teste Vitest",
      phone: "(31) 98765-4321",
      email: "vitest@teste.com",
      cpf: "111.222.333-44",
      city: "Belo Horizonte",
      state: "MG",
      status: "ativo",
    });
    expect(result.success).toBe(true);
    expect(result.client).toBeDefined();
    expect(result.client!.name).toBe("Cliente Teste Vitest");
    expect(result.client!.phone).toBe("(31) 98765-4321");
    expect(result.client!.email).toBe("vitest@teste.com");
    expect(result.client!.cpf).toBe("111.222.333-44");
    expect(result.client!.city).toBe("Belo Horizonte");
    expect(result.client!.state).toBe("MG");
    expect(result.client!.status).toBe("ativo");
    createdClientId = result.client!.id;
  });

  it("creates a client with speciesInterest array", async () => {
    const result = await caller.cliente.create({
      name: "Cliente Espécies",
      phone: "(31) 91111-2222",
      speciesInterest: ["Ringneck", "Alexandrino", "Moustache"],
      status: "lista_espera",
    });
    expect(result.success).toBe(true);
    expect(result.client!.speciesInterest).toEqual(["Ringneck", "Alexandrino", "Moustache"]);
    expect(result.client!.status).toBe("lista_espera");
    // Cleanup
    await caller.cliente.delete({ id: result.client!.id });
  });

  it("gets client by ID with purchases", async () => {
    const result = await caller.cliente.getById({ id: createdClientId });
    expect(result).not.toBeNull();
    expect(result!.name).toBe("Cliente Teste Vitest");
    expect(result!.purchases).toBeDefined();
    expect(Array.isArray(result!.purchases)).toBe(true);
  });

  it("updates a client", async () => {
    const result = await caller.cliente.update({
      id: createdClientId,
      name: "Cliente Atualizado",
      status: "inativo",
      notes: "Nota de teste",
    });
    expect(result.success).toBe(true);
    expect(result.client!.name).toBe("Cliente Atualizado");
    expect(result.client!.status).toBe("inativo");
    expect(result.client!.notes).toBe("Nota de teste");
    // Original fields should remain
    expect(result.client!.phone).toBe("(31) 98765-4321");
  });

  it("lists clients and includes the updated client", async () => {
    const result = await caller.cliente.list();
    const found = result.find((c) => c.id === createdClientId);
    expect(found).toBeDefined();
    expect(found!.name).toBe("Cliente Atualizado");
  });

  it("deletes a client", async () => {
    const result = await caller.cliente.delete({ id: createdClientId });
    expect(result.success).toBe(true);
    // Verify it's gone
    const check = await caller.cliente.getById({ id: createdClientId });
    expect(check).toBeNull();
  });

  it("rejects creation with empty name", async () => {
    await expect(
      caller.cliente.create({ name: "", phone: "(31) 99999-0000" })
    ).rejects.toThrow();
  });

  it("rejects creation with empty phone", async () => {
    await expect(
      caller.cliente.create({ name: "Teste", phone: "" })
    ).rejects.toThrow();
  });
});

describe("purchase router", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  let clientId: number;
  let purchaseId: number;

  it("creates a client for purchase tests", async () => {
    const result = await caller.cliente.create({
      name: "Cliente Compras",
      phone: "(31) 93333-4444",
    });
    expect(result.success).toBe(true);
    clientId = result.client!.id;
  });

  it("creates a purchase for the client", async () => {
    const result = await caller.purchase.create({
      clientId,
      species: "Ringneck",
      quantity: 2,
      valueCents: 250000,
      invoiceNumber: "NF-001",
      saleDate: "2026-05-20",
      notes: "Casal de ringneck azul",
    });
    expect(result.success).toBe(true);
    expect(result.purchase).toBeDefined();
    expect(result.purchase!.species).toBe("Ringneck");
    expect(result.purchase!.quantity).toBe(2);
    expect(result.purchase!.valueCents).toBe(250000);
    expect(result.purchase!.invoiceNumber).toBe("NF-001");
    purchaseId = result.purchase!.id;
  });

  it("lists purchases for the client", async () => {
    const result = await caller.purchase.listByClient({ clientId });
    expect(result.length).toBeGreaterThanOrEqual(1);
    const found = result.find((p) => p.id === purchaseId);
    expect(found).toBeDefined();
    expect(found!.species).toBe("Ringneck");
  });

  it("shows purchases in client detail", async () => {
    const client = await caller.cliente.getById({ id: clientId });
    expect(client!.purchases.length).toBeGreaterThanOrEqual(1);
  });

  it("deletes a purchase", async () => {
    const result = await caller.purchase.delete({ id: purchaseId });
    expect(result.success).toBe(true);
    // Verify it's gone
    const purchases = await caller.purchase.listByClient({ clientId });
    const found = purchases.find((p) => p.id === purchaseId);
    expect(found).toBeUndefined();
  });

  it("cleans up: deletes the test client", async () => {
    const result = await caller.cliente.delete({ id: clientId });
    expect(result.success).toBe(true);
  });
});

describe("purchase.listAll and purchase.overdueInstallments", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  let clientId: number;
  let purchaseId: number;

  it("creates a client and purchase for report tests", async () => {
    const clientResult = await caller.cliente.create({
      name: "Cliente Relatório",
      phone: "(31) 95555-6666",
    });
    clientId = clientResult.client!.id;

    const purchaseResult = await caller.purchase.create({
      clientId,
      species: "Alexandrino",
      quantity: 1,
      valueCents: 300000,
      saleDate: "2026-06-01",
      installmentsCount: 3,
      installments: [
        { valueCents: 100000, dueDate: "2026-05-01" }, // overdue (past)
        { valueCents: 100000, dueDate: "2026-07-01" }, // future
        { valueCents: 100000, dueDate: "2026-08-01" }, // future
      ],
    });
    expect(purchaseResult.success).toBe(true);
    purchaseId = purchaseResult.purchase!.id;
  });

  it("listAll returns all purchases with client name", async () => {
    const result = await caller.purchase.listAll();
    expect(Array.isArray(result)).toBe(true);
    const found = result.find((p: any) => p.id === purchaseId);
    expect(found).toBeDefined();
    expect(found!.clientName).toBe("Cliente Relatório");
    expect(found!.species).toBe("Alexandrino");
    expect(found!.installments).toBeDefined();
    expect(found!.installments.length).toBe(3);
  });

  it("overdueInstallments returns past-due pending installments", async () => {
    const result = await caller.purchase.overdueInstallments();
    expect(Array.isArray(result)).toBe(true);
    // Should find at least the one with dueDate 2026-05-01
    const found = result.find((i: any) => i.purchaseId === purchaseId);
    expect(found).toBeDefined();
    expect(found!.valueCents).toBe(100000);
  });

  it("cleans up: deletes purchase and client", async () => {
    await caller.purchase.delete({ id: purchaseId });
    await caller.cliente.delete({ id: clientId });
  });
});
