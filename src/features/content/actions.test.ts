import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

vi.mock("@/lib/db", () => ({ db: { post: { update: vi.fn() } } }));
vi.mock("@/lib/rbac", async () => {
  const actual = await vi.importActual<typeof import("@/lib/rbac")>("@/lib/rbac");
  return { ...actual, getSession: vi.fn() };
});
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { db } from "@/lib/db";
import { getSession } from "@/lib/rbac";
import { publishPost } from "./actions";

const mockedGetSession = getSession as unknown as Mock;
const mockedUpdate = db.post.update as unknown as Mock;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("publishPost", () => {
  it("rejects trainers", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "TRAINER" } });
    await expect(publishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("rejects members", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "MEMBER" } });
    await expect(publishPost({ postId: "p1" })).rejects.toThrow("Forbidden");
    expect(mockedUpdate).not.toHaveBeenCalled();
  });

  it("publishes for admins", async () => {
    mockedGetSession.mockResolvedValue({ user: { id: "u1", role: "ADMIN" } });
    mockedUpdate.mockResolvedValue({ id: "p1", status: "PUBLISHED" });
    const result = await publishPost({ postId: "p1" });
    expect(result).toEqual({ ok: true });
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "p1" },
      data: { status: "PUBLISHED" },
    });
  });
});
