import { describe, expect, it, beforeAll } from "vitest";
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

describe("topicComment", () => {
  const ctx = createPublicContext();
  const caller = appRouter.createCaller(ctx);

  it("getAll returns an object (initially empty or with existing data)", async () => {
    const result = await caller.topicComment.getAll();
    expect(typeof result).toBe("object");
    expect(result).not.toBeNull();
  });

  it("save stores a comment and getAll retrieves it", async () => {
    const topicKey = "__test__::0";
    const comment = "Comentário de teste para vitest";

    // Save
    const saveResult = await caller.topicComment.save({ topicKey, comment });
    expect(saveResult).toEqual({ success: true });

    // Retrieve
    const all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBe(comment);
  });

  it("save overwrites existing comment for same topicKey", async () => {
    const topicKey = "__test__::1";

    await caller.topicComment.save({ topicKey, comment: "Primeiro comentário" });
    await caller.topicComment.save({ topicKey, comment: "Comentário atualizado" });

    const all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBe("Comentário atualizado");
  });

  it("save with empty comment removes the entry", async () => {
    const topicKey = "__test__::2";

    await caller.topicComment.save({ topicKey, comment: "Temporário" });
    let all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBe("Temporário");

    // Save empty to remove
    await caller.topicComment.save({ topicKey, comment: "" });
    all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBeUndefined();
  });

  it("save with whitespace-only comment removes the entry", async () => {
    const topicKey = "__test__::3";

    await caller.topicComment.save({ topicKey, comment: "Algo" });
    await caller.topicComment.save({ topicKey, comment: "   " });

    const all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBeUndefined();
  });

  it("save trims whitespace from comments", async () => {
    const topicKey = "__test__::4";

    await caller.topicComment.save({ topicKey, comment: "  Texto com espaços  " });

    const all = await caller.topicComment.getAll();
    expect(all[topicKey]).toBe("Texto com espaços");
  });

  it("rejects empty topicKey", async () => {
    await expect(
      caller.topicComment.save({ topicKey: "", comment: "test" })
    ).rejects.toThrow();
  });
});
