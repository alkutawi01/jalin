/** The middleware with real signed cookies: a staff role is limited by the permission map, and a temporary password opens nothing else. */
import crypto from "node:crypto";
process.env.ADMIN_SECRET = "test-secret-for-middleware";
(process.env as Record<string, string>).NODE_ENV = "test";
import { NextRequest } from "next/server";
import { middleware } from "../src/middleware";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
function token(claims: Record<string, unknown>) {
  const payload = Buffer.from(JSON.stringify({ expires: Date.now() + 3600_000, ...claims })).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", process.env.ADMIN_SECRET!).update(payload).digest("base64url")}`;
}
async function call(method: string, path: string, claims?: Record<string, unknown>) {
  const req = new NextRequest(`http://localhost${path}`, { method, headers: claims ? { cookie: `jalin-admin-session=${token(claims)}` } : {} });
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
  assert((await call("GET", "/admin/pengguna", editor)).location.endsWith("/admin"), "an editor sent from the Pengguna page back to the dashboard");
  assert((await call("POST", "/api/admin/works/1/publish", chief)).status === 403 && (await call("POST", "/api/admin/works/1/publish", owner)).next, "only the owner publishes");
  assert((await call("POST", "/api/admin/works", editor)).next, "an editor may write works");
  assert((await call("GET", "/api/admin/works", { ...editor, role: "superuser" })).status === 401, "an unknown role in a signed token is refused");

  const blocked = await call("GET", "/admin/works", fresh);
  assert(blocked.location.endsWith("/admin/ubah-kata-laluan"), "a temporary password sends every page to the password page");
  assert((await call("GET", "/api/admin/works", fresh)).status === 403, "and refuses every API call");
  assert((await call("GET", "/admin/ubah-kata-laluan", fresh)).next && (await call("POST", "/api/admin/auth/change-password", fresh)).next && (await call("POST", "/api/admin/auth/logout", fresh)).next, "but the password page, the change call and sign-out stay open");
  assert((await call("GET", "/api/admin/works")).status === 401, "no cookie is still 401");
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
