import { describe, it, expect } from "vitest";
import { assertRole, type Role } from "./rbac";

function makeSession(role: Role) {
  return { user: { id: "u1", role } } as const;
}

describe("assertRole", () => {
  it("passes when the user's role is in the allowed list", () => {
    expect(() => assertRole(makeSession("ADMIN"), ["ADMIN", "TRAINER"])).not.toThrow();
  });

  it("throws when the user's role is not in the allowed list", () => {
    expect(() => assertRole(makeSession("MEMBER"), ["ADMIN", "TRAINER"])).toThrow(
      "Forbidden: requires role ADMIN or TRAINER"
    );
  });

  it("throws when session is null", () => {
    expect(() => assertRole(null, ["ADMIN"])).toThrow("Unauthorized");
  });
});
