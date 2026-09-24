// Added for the BuildBase example: who may do what, as decided in
// src/middleware.ts. Run with `npm test` (Node 22.18+ runs TypeScript directly).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { decide, type Member, type Role } from "../src/lib/buildbase.ts";

const member = (role: Role | null): Member => ({
  id: "u1",
  email: "ada@example.com",
  role,
  workspaces: [],
});

const check = (pathname: string, method: string, who: Member | null, apiToken = false) =>
  decide({ pathname, method, apiToken, member: who });

describe("access", () => {
  it("leaves the landing page and sign-in open", () => {
    assert.deepEqual(check("/", "GET", null), { allow: true });
    assert.deepEqual(check("/auth/sign-in", "GET", null), { allow: true });
    assert.deepEqual(check("/access", "GET", null), { allow: true });
  });

  it("sends signed-out visitors to sign in, for pages and the API", () => {
    assert.deepEqual(check("/admin", "GET", null), { allow: false, status: 401, reason: "sign-in" });
    assert.deepEqual(check("/admin/customers/1", "GET", null), { allow: false, status: 401, reason: "sign-in" });
    assert.deepEqual(check("/api/customers", "GET", null), { allow: false, status: 401, reason: "sign-in" });
  });

  it("keeps out people who are not in the admin workspace", () => {
    assert.deepEqual(check("/admin", "GET", member(null)), { allow: false, status: 403, reason: "not-a-member" });
    assert.deepEqual(check("/api/customers", "GET", member(null)), { allow: false, status: 403, reason: "not-a-member" });
  });

  it("lets admins and editors change data", () => {
    for (const role of ["admin", "editor"] as const) {
      assert.deepEqual(check("/api/customers", "POST", member(role)), { allow: true });
      assert.deepEqual(check("/api/customers/1/workflow", "POST", member(role)), { allow: true });
    }
  });

  it("lets viewers read but not write", () => {
    assert.deepEqual(check("/admin/customers", "GET", member("viewer")), { allow: true });
    assert.deepEqual(check("/api/customers", "GET", member("viewer")), { allow: true });
    assert.deepEqual(check("/api/customers", "POST", member("viewer")), { allow: false, status: 403, reason: "read-only" });
  });

  it("still accepts the API token on the API, and only there", () => {
    assert.deepEqual(check("/api/customers", "POST", null, true), { allow: true });
    assert.deepEqual(check("/admin", "GET", null, true), { allow: false, status: 401, reason: "sign-in" });
  });

  it("does not mistake a lookalike path for the admin", () => {
    assert.deepEqual(check("/administrator", "GET", null), { allow: true });
  });
});
