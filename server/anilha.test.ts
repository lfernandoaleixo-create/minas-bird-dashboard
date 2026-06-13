import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { normalizeAnilha } from "./db";

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

describe("normalizeAnilha", () => {
  it("removes spaces and converts to uppercase", () => {
    expect(normalizeAnilha("AB 123")).toBe("AB123");
    expect(normalizeAnilha("ab 123")).toBe("AB123");
    expect(normalizeAnilha(" a b  1 2 3 ")).toBe("AB123");
  });

  it("removes special characters", () => {
    expect(normalizeAnilha("AB-123/456")).toBe("AB123456");
    expect(normalizeAnilha("AB.123.456")).toBe("AB123456");
    expect(normalizeAnilha("AB_123_456")).toBe("AB123456");
  });

  it("returns empty string for empty/whitespace-only input", () => {
    expect(normalizeAnilha("")).toBe("");
    expect(normalizeAnilha("   ")).toBe("");
    expect(normalizeAnilha("---")).toBe("");
  });

  it("handles already normalized input", () => {
    expect(normalizeAnilha("ABC123")).toBe("ABC123");
  });
});

describe("plantel.checkAnilha", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  it("returns exists=false for non-existing anilha", async () => {
    const result = await caller.plantel.checkAnilha({ anilha: "ZZZZZ99999NONEXIST" });
    expect(result.exists).toBe(false);
    expect(result.bird).toBeNull();
  });

  it("returns exists=false for empty anilha", async () => {
    const result = await caller.plantel.checkAnilha({ anilha: "" });
    expect(result.exists).toBe(false);
    expect(result.bird).toBeNull();
  });

  it("returns exists=false for whitespace-only anilha", async () => {
    const result = await caller.plantel.checkAnilha({ anilha: "   " });
    expect(result.exists).toBe(false);
    expect(result.bird).toBeNull();
  });
});

describe("plantel.create rejects duplicate anilha", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  it("creates bird with unique anilha and rejects duplicate", async () => {
    // Create first bird with a unique test anilha
    const uniqueAnilha = `TEST${Date.now()}`;
    const bird1 = await caller.plantel.create({
      speciesId: "psittacula-krameri",
      speciesName: "Ringneck",
      anilha: uniqueAnilha,
      sex: "macho",
      origin: "nascido_criadouro",
      status: "ativo",
    });
    expect(bird1).toBeTruthy();
    expect((bird1 as any).id).toBeTruthy();

    // Try to create second bird with same anilha (should fail)
    await expect(
      caller.plantel.create({
        speciesId: "psittacula-krameri",
        speciesName: "Ringneck",
        anilha: uniqueAnilha,
        sex: "femea",
        origin: "nascido_criadouro",
        status: "ativo",
      })
    ).rejects.toThrow(/Anilha já cadastrada/);

    // Try with spaces (should still fail - normalized comparison)
    const anilhaWithSpaces = uniqueAnilha.split("").join(" ");
    await expect(
      caller.plantel.create({
        speciesId: "psittacula-krameri",
        speciesName: "Ringneck",
        anilha: anilhaWithSpaces,
        sex: "femea",
        origin: "nascido_criadouro",
        status: "ativo",
      })
    ).rejects.toThrow(/Anilha já cadastrada/);

    // Cleanup
    await caller.plantel.delete({ id: (bird1 as any).id });
  });

  it("allows updating a bird with its own anilha (excludeId)", async () => {
    const uniqueAnilha = `TESTEDIT${Date.now()}`;
    const bird = await caller.plantel.create({
      speciesId: "psittacula-krameri",
      speciesName: "Ringneck",
      anilha: uniqueAnilha,
      sex: "macho",
      origin: "nascido_criadouro",
      status: "ativo",
    });
    const birdId = (bird as any).id;

    // Updating with same anilha should work (excludeId = own id)
    const updated = await caller.plantel.update({
      id: birdId,
      anilha: uniqueAnilha,
      mutation: "Azul",
    });
    expect(updated).toBeTruthy();

    // checkAnilha with excludeId should return false
    const check = await caller.plantel.checkAnilha({
      anilha: uniqueAnilha,
      excludeId: birdId,
    });
    expect(check.exists).toBe(false);

    // checkAnilha without excludeId should return true
    const check2 = await caller.plantel.checkAnilha({
      anilha: uniqueAnilha,
    });
    expect(check2.exists).toBe(true);
    expect(check2.bird?.id).toBe(birdId);

    // Cleanup
    await caller.plantel.delete({ id: birdId });
  });
});
