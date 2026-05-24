import { describe, it, expect } from "vitest";
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

describe("purchase with payment method and installments", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  let clientId: number;
  let purchaseId: number;

  it("creates a client for payment tests", async () => {
    const result = await caller.cliente.create({
      name: "Cliente Pagamento Teste",
      phone: "(31) 95555-6666",
    });
    expect(result.success).toBe(true);
    clientId = result.client!.id;
  });

  it("creates a purchase with PIX payment (no installments)", async () => {
    const result = await caller.purchase.create({
      clientId,
      species: "Alexandrino",
      quantity: 1,
      valueCents: 500000,
      paymentMethod: "pix",
      installmentsCount: 1,
      saleDate: "2026-05-20",
    });
    expect(result.success).toBe(true);
    expect(result.purchase).toBeDefined();
    expect(result.purchase!.paymentMethod).toBe("pix");
    // PIX = 1 installment, but no installment records created
    expect(result.purchase!.installments).toHaveLength(0);
    // Also verify via getInstallments
    const installments = await caller.purchase.getInstallments({ purchaseId: result.purchase!.id });
    expect(installments.length).toBe(0);
    // Cleanup
    await caller.purchase.delete({ id: result.purchase!.id });
  });

  it("creates a purchase with credit card and 3 installments", async () => {
    const result = await caller.purchase.create({
      clientId,
      species: "Ringneck",
      quantity: 2,
      valueCents: 300000,
      paymentMethod: "cartao_credito",
      installmentsCount: 3,
      saleDate: "2026-05-20",
      invoiceNumber: "NF-PAY-001",
      installments: [
        { valueCents: 100000, dueDate: "2026-06-20" },
        { valueCents: 100000, dueDate: "2026-07-20" },
        { valueCents: 100000, dueDate: "2026-08-20" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.purchase).toBeDefined();
    expect(result.purchase!.paymentMethod).toBe("cartao_credito");
    expect(result.purchase!.installments).toHaveLength(3);
    purchaseId = result.purchase!.id;
  });

  it("lists installments for the purchase", async () => {
    const installments = await caller.purchase.getInstallments({ purchaseId });
    expect(installments.length).toBe(3);
    expect(installments[0].installmentNumber).toBe(1);
    expect(installments[0].valueCents).toBe(100000);
    expect(installments[0].status).toBe("pendente");
    expect(installments[1].installmentNumber).toBe(2);
    expect(installments[2].installmentNumber).toBe(3);
  });

  it("marks an installment as paid", async () => {
    const installments = await caller.purchase.getInstallments({ purchaseId });
    const firstId = installments[0].id;
    const result = await caller.purchase.updateInstallment({
      id: firstId,
      status: "pago",
      paidAt: "2026-06-20T10:00:00.000Z",
    });
    expect(result.success).toBe(true);
    expect(result.installment).toBeDefined();
    expect(result.installment!.status).toBe("pago");
    expect(result.installment!.paidAt).toBeDefined();
  });

  it("reverts an installment back to pendente", async () => {
    const installments = await caller.purchase.getInstallments({ purchaseId });
    const firstId = installments[0].id;
    const result = await caller.purchase.updateInstallment({
      id: firstId,
      status: "pendente",
      paidAt: null,
    });
    expect(result.success).toBe(true);
    expect(result.installment!.status).toBe("pendente");
  });

  it("marks an installment as atrasado", async () => {
    const installments = await caller.purchase.getInstallments({ purchaseId });
    const secondId = installments[1].id;
    const result = await caller.purchase.updateInstallment({
      id: secondId,
      status: "atrasado",
    });
    expect(result.success).toBe(true);
    expect(result.installment!.status).toBe("atrasado");
  });

  it("includes installments (parcelas) in client detail", async () => {
    const client = await caller.cliente.getById({ id: clientId });
    expect(client).not.toBeNull();
    const purchase = client!.purchases.find((p: any) => p.id === purchaseId);
    expect(purchase).toBeDefined();
    expect(purchase!.parcelas).toBeDefined();
    expect(purchase!.parcelas.length).toBe(3);
  });

  it("includes installments in purchase.listByClient", async () => {
    const purchases = await caller.purchase.listByClient({ clientId });
    const purchase = purchases.find((p: any) => p.id === purchaseId);
    expect(purchase).toBeDefined();
    expect(purchase!.installments).toBeDefined();
    expect(purchase!.installments.length).toBe(3);
  });

  it("creates a purchase with boleto and 2 installments", async () => {
    const result = await caller.purchase.create({
      clientId,
      species: "Moustache",
      quantity: 1,
      valueCents: 200000,
      paymentMethod: "boleto",
      installmentsCount: 2,
      saleDate: "2026-05-22",
      installments: [
        { valueCents: 100000, dueDate: "2026-06-22" },
        { valueCents: 100000, dueDate: "2026-07-22" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.purchase!.paymentMethod).toBe("boleto");
    expect(result.purchase!.installments).toHaveLength(2);
    // Cleanup
    await caller.purchase.delete({ id: result.purchase!.id });
  });

  it("deleting a purchase also removes its installments", async () => {
    const result = await caller.purchase.delete({ id: purchaseId });
    expect(result.success).toBe(true);
    // Verify installments are gone
    const installments = await caller.purchase.getInstallments({ purchaseId });
    expect(installments.length).toBe(0);
  });

  it("cleans up: deletes the test client", async () => {
    const result = await caller.cliente.delete({ id: clientId });
    expect(result.success).toBe(true);
  });
});
