/** The middleware with real signed cookies: a staff role is limited by the permission map, and a temporary password opens nothing else. */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
process.env.ADMIN_SECRET = "test-secret-for-middleware";
(process.env as Record<string, string>).NODE_ENV = "test";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
function token(claims: Record<string, unknown>, signingKey = process.env.ADMIN_SECRET!) {
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + 3600_000, ...claims })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", signingKey).update(payload).digest("base64url")}`;
}
async function call(method: string, path: string, claims?: Record<string, unknown>, signingKey?: string) {
  const req = new NextRequest(`http://localhost${path}`, { method, headers: claims ? { cookie: `jalin-admin-session=${token(claims, signingKey)}` } : {} });
  const res = await middleware(req);
  return { status: res.status, location: res.headers.get("location") ?? "", next: res.headers.get("x-middleware-next") === "1" };
}
(async () => {
  const owner = { id: "admin-x", role: "admin", email: "o@x.my" };
  const editor = { id: "u-1", role: "editor", email: "e" };
  const chief = { id: "u-2", role: "chief_editor", email: "c" };
  const fresh = { id: "u-3", role: "editor", email: "f", mcp: true };

  assert((await call("GET", "/api/admin/users", owner)).next, "the owner reaches the users API");
  assert((await call("GET", "/api/admin/users", editor)).status === 403 && (await call("GET", "/api/admin/users", chief)).status === 403, "an editor and a chief editor get 403 on the users API");
  assert((await call("GET", "/admin/pengguna", editor)).location.endsWith("/admin?terhad=1"), "an editor sent from the Pengguna page to the dashboard, marked so it can say why");
  assert((await call("GET", "/admin/series/new", editor)).location.endsWith("/admin?terhad=1") && (await call("GET", "/admin/series/new", chief)).next, "the same for a page of a permission the role lacks (new series: not an editor, yes a chief editor)");
  const dashboard = fs.readFileSync(path.join(__dirname, "..", "src/app/admin/page.tsx"), "utf8");
  assert(dashboard.includes('(await searchParams)?.terhad ?? "") === "1"') && dashboard.includes("Halaman itu tidak dibuka kerana peranan anda tidak mempunyai kebenaran untuknya.") && dashboard.includes('role="alert"'), "the dashboard says why the page did not open (only for the exact mark; the address is never echoed)");
  assert((await call("POST", "/api/admin/works/1/publish", chief)).status === 403 && (await call("POST", "/api/admin/works/1/publish", owner)).next, "only the owner publishes");
  assert((await call("POST", "/api/admin/works", editor)).next, "an editor may write works");
  assert((await call("GET", "/api/admin/works", { ...editor, role: "superuser" })).status === 401, "an unknown role in a signed token is refused");

  const blocked = await call("GET", "/admin/works", fresh);
  assert(blocked.location.endsWith("/admin/ubah-kata-laluan"), "a temporary password sends every page to the password page");
  assert((await call("GET", "/api/admin/works", fresh)).status === 403, "and refuses every API call");
  assert((await call("GET", "/admin/ubah-kata-laluan", fresh)).next && (await call("POST", "/api/admin/auth/change-password", fresh)).next && (await call("POST", "/api/admin/auth/logout", fresh)).next, "but the password page, the change call and sign-out stay open");
  assert((await call("GET", "/api/admin/works")).status === 401, "no cookie is still 401");
  process.env.ADMIN_SESSION_KEY = "a".repeat(48);
  assert((await call("GET", "/api/admin/users", owner)).status === 401, "a token signed with ADMIN_SECRET is rejected after session-key rotation");
  assert((await call("GET", "/api/admin/users", owner, process.env.ADMIN_SESSION_KEY)).next, "a token signed with the dedicated session key is accepted");
  delete process.env.ADMIN_SESSION_KEY;
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
