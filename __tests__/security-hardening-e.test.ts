import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { deviceSessionExpired } from "../src/lib/reader-auth/service";

const day = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-10T00:00:00.000Z");
const before = (days: number) => new Date(now.getTime() - days * day);
assert.equal(deviceSessionExpired(before(100), before(89), now), false);
assert.equal(deviceSessionExpired(before(100), before(91), now), true, "inactive for 90+ days requires sign-in again");
assert.equal(deviceSessionExpired(before(366), before(1), now), true, "a device older than 365 days expires despite recent use");
assert.equal(deviceSessionExpired(before(365), before(90), now), false, "boundary is exclusive");

const source = (relative: string) => readFileSync(join(__dirname, "..", relative), "utf8");
const guards = source("src/lib/admin/langganan-api.ts");
assert(guards.includes("const admin = await getCurrentAdmin()") && guards.includes('return guardedFor(run, "subscription.manage")') && guards.includes("panelGuarded"), "reader API and panel API recheck live accounts with separate permissions");
assert(source("src/app/admin/aktiviti/page.tsx").includes("if (!admin || (admin.role !== \"admin\" && admin.role !== \"chief_editor\")) notFound()"), "activity read has a server-side account check");
assert(source("src/app/log-masuk/page.tsx").includes("Sesi peranti anda telah tamat atau tidak lagi sah"), "an expired session gives a clear re-login notice");
const metadata = source("src/app/kategori/[type]/[slug]/page.tsx");
assert(metadata.includes("visibleChapter = chapter && (await gateForWork(work.slug)).state === \"open\"") && metadata.includes("visibleChapter.title"), "locked chapter metadata does not use its title");
console.log("security hardening E tests passed");
