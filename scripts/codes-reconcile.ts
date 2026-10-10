/**
 * After a database restore: read the signed file of codes kept outside the database and put right what the restore lost.
 *   npx tsx scripts/codes-reconcile.ts <file> --check            only report what would change (writes nothing)
 *   npx tsx scripts/codes-reconcile.ts <file> --apply            apply it; the stop switch is turned ON and stays on until a person turns it off
 *   npx tsx scripts/codes-reconcile.ts <file> --find-email a@b   list what that e-mail address had redeemed according to the file
 *   Append --legacy-plaintext only when manually recovering an older, unencrypted export.
 * Against production it needs ALLOW_NON_DEV_DATABASE=yes and the production DATABASE_URL_UNPOOLED, for that one command only.
 */
import "dotenv/config";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
config({ path: ".env.local", override: true });
import { closeDb, getDb } from "../src/lib/db";
import { findRedemptionsByEmailMac, parseCodesExport, reconcileWithExport } from "../src/lib/reader-auth/codes-export";
import { emailLookupMac, loadCodeKey, loadMacKey } from "../src/lib/reader-auth/primitives";

async function main() {
  const [file, mode, arg] = process.argv.slice(2);
  if (!file || !["--check", "--apply", "--find-email"].includes(mode ?? "")) {
    console.error("Guna: codes-reconcile <fail> --check | --apply | --find-email <emel>");
    process.exit(2);
  }
  const parsed = parseCodesExport(readFileSync(file, "utf8"), loadCodeKey(), { allowLegacyPlaintext: process.argv.includes("--legacy-plaintext") });
  console.log(`Fail sah, dibuat ${parsed.at.toISOString()}: ${parsed.batches.length} kelompok, ${parsed.codes.length} kod, ${parsed.redemptions.length} penebusan kad, ${parsed.shared.length} kod kongsi.`);
  if (mode === "--find-email") {
    const found = findRedemptionsByEmailMac(parsed, emailLookupMac(loadMacKey(), (arg ?? "").trim().toLowerCase()));
    console.log(found.length ? JSON.stringify(found, null, 2) : "Tiada penebusan untuk emel ini dalam fail.");
    return;
  }
  const report = await reconcileWithExport(getDb(), parsed, { apply: mode === "--apply", by: "codes-reconcile" });
  console.log(JSON.stringify(report, null, 2));
  if (report.applied) console.log("\nSuis henti penebusan DIHIDUPKAN. Semak laporan, beri semula akses kepada pembaca yang hilang, kemudian matikan suis di admin.");
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 1; }).finally(() => closeDb());
