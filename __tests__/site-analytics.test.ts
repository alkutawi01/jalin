/** Site statistics: private pages are never counted, and both providers are named in the Dasar privasi. */
import fs from "node:fs";
import { ANALYTICS_SKIP } from "../src/components/reader/SiteAnalytics";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}

for (const path of ["/admin", "/admin/works/abc", "/akaun", "/akaun/bacaan", "/api/akaun/kod", "/pratonton/x"]) assert(ANALYTICS_SKIP.test(path), `${path} is not counted`);
for (const path of ["/", "/kategori/cerpen", "/kategori/cerpen/baki-hari", "/mula", "/log-masuk", "/privasi", "/adminlain", "/akaunting"]) assert(!ANALYTICS_SKIP.test(path), `${path} is counted`);

const layout = fs.readFileSync("src/app/layout.tsx", "utf8");
assert(layout.includes("SiteAnalytics") && layout.includes('process.env.VERCEL_ENV === "production"') && layout.includes("CF_ANALYTICS_TOKEN"), "the layout loads the statistics on the live site only, and Cloudflare only with a token");
const notice = fs.readFileSync("src/components/reader/PrivacyNotice.tsx", "utf8");
assert(notice.includes("Vercel Web Analytics") && notice.match(/Vercel Web Analytics/g)!.length === 2, "the Dasar privasi names the statistics provider in both languages");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
