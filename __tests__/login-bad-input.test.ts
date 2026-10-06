/** The login API answered a body that is not JSON, or an email that is not text, with a 500 "Ralat tidak diketahui". It is a 400. */
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/admin/auth/login/route";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const call = async (body: string) => {
  const res = await POST(new NextRequest("http://localhost/api/admin/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body }));
  return { status: res.status, error: ((await res.json()) as { error?: string }).error };
};
(async () => {
  assert((await call("{")).status === 400, "a body that is not JSON is a 400");
  assert((await call("null")).status === 400 && (await call("[]")).status === 400 && (await call("5")).status === 400, "null, an array and a number are a 400");
  const num = await call('{"email":1,"password":"x"}');
  assert(num.status === 400 && num.error === "Email diperlukan.", "an email that is not text is 'Email diperlukan.'");
  assert((await call("{}")).error === "Email diperlukan." && (await call('{"email":"a@b.c"}')).error === "Password diperlukan.", "the old messages are unchanged");
  assert((await call('{"email":"a@b.c","password":123}')).error === "Password diperlukan.", "a password that is not text is refused");
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
})();
