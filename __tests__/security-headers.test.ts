/** The headers every response carries, and that the config actually sends them. */
// @ts-expect-error - plain .mjs config, no type declarations
import nextConfig, { securityHeaders } from "../next.config.mjs";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

async function main() {
  const byKey = new Map((securityHeaders as Array<{ key: string; value: string }>).map((h) => [h.key, h.value]));
  assert(byKey.get("X-Frame-Options") === "DENY", "pages cannot be framed by another site");
  assert(byKey.get("X-Content-Type-Options") === "nosniff", "browsers do not guess content types");
  assert(Boolean(byKey.get("Referrer-Policy")), "a referrer policy is set");
  assert(/camera=\(\)/.test(byKey.get("Permissions-Policy") ?? ""), "camera and the like are switched off");
  assert(nextConfig.poweredByHeader === false, "the framework name is not advertised");

  const rules = await nextConfig.headers();
  assert(
    rules.length === 1 && rules[0].source === "/:path*" && rules[0].headers === securityHeaders,
    "the headers apply to every path"
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}

main();
