/**
 * Panel Bacaan AI: database check. Everything runs in one transaction that is rolled back at the end, so nothing is left behind.
 * Local work only reaches the development branch (src/lib/db/env.ts). Run: npm run db:panel-check
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { sql } from "kysely";
import { closeDb, getDb } from "../src/lib/db";
import { assemble, addRating, ensureSnapshot, extrasOf, listCandidates, ratingsOf, resultOf, supplementaryResult, timeline, voidRating } from "../src/lib/panel/service";
import { RUBRIC_VERSION } from "../src/lib/panel/rubric";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
class Undo extends Error {}

const BODY = "Hujan turun sejak pagi di tepi Sungai Kelantan. Mak menjemur kain di serambi walaupun langit kelabu. Aku tahu dia sedang menunggu seseorang yang tidak akan pulang.";
const answer = (code: string, scores: Record<string, string> = {}) => {
  const q = (s: string) => `"${s}"`;
  const quotes = ["Hujan turun sejak pagi", "Aku tahu dia sedang menunggu", "seseorang yang tidak akan pulang", "Mak menjemur kain di serambi", "di tepi Sungai Kelantan", "walaupun langit kelabu"];
  const lines = ["FORMAT: JALIN_PANEL_V2", `KOD: ${code}`, "MODEL: Model Ujian", "VERDIK: Sebuah cerpen pendek yang tenang dan berkesan.", `BUKTI_AWAL: ${q("Hujan turun sejak pagi di tepi Sungai Kelantan")}`, `BUKTI_AKHIR: ${q("seseorang yang tidak akan pulang.")}`];
  for (let i = 1; i <= 6; i++) {
    lines.push(`K${i}_SKOR: ${scores[`K${i}`] ?? "8"}`, `K${i}_BUKTI: ${scores[`B${i}`] ?? q(quotes[i - 1]!)}`, `K${i}_SEBAB: Petikan itu menunjukkan kawalan dan fungsi yang jelas dalam karya ini.`);
  }
  lines.push("TAMAT: JALIN_PANEL_V2");
  return lines.join("\n");
};
const all = (v: string) => ({ K1: v, K2: v, K3: v, K4: v, K5: v, K6: v });

async function main() {
  const db = getDb();
  try {
    await db.transaction().execute(async (trx) => {
      const id = `panel-check-${Date.now()}`;
      await trx.insertInto("works").values({ id, slug: id, title: "Hujan di Kelantan", type: "cerpen", status: "draft", body: BODY, version: "1.0", revision_count: 0, editorial_history: "{}", metadata: null, reader: null } as never).execute();

      console.log("\nSnapshots");
      const first = await ensureSnapshot(trx, "work", id, "ujian");
      assert(!("error" in first) && first.created && /^PNL-[A-Z2-9]{8}$/.test(first.snapshot.ref_code), "a snapshot is made with a PNL- reference code", first);
      if ("error" in first) throw new Error("no snapshot");
      const again = await ensureSnapshot(trx, "work", id, "ujian");
      assert(!("error" in again) && !again.created && again.snapshot.id === first.snapshot.id, "the same text gives the same snapshot (no duplicate)");
      const asm = await assemble(trx, "work", id);
      assert(!("error" in asm) && asm.hash === first.snapshot.content_hash && asm.text === BODY, "the hash is stable and the text is the body");

      console.log("\nRatings");
      const code = first.snapshot.ref_code;
      const r1 = await addRating(trx, { snapshotId: first.snapshot.id, reviewerLabel: "ChatGPT A", provider: "Penyedia A", raw: answer(code, all("8.5")), by: "ujian" });
      assert(r1.ok && r1.rating.compositeText === "8.500", "a valid answer is stored with its exact composite", r1);
      let res = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(res.count === 1 && res.meetsThreshold === true && res.meanText === "8.500", "one rating is enough and 8.500 qualifies");
      const r2 = await addRating(trx, { snapshotId: first.snapshot.id, reviewerLabel: "ChatGPT B", contributed: "ya", raw: answer(code, {}), by: "ujian" });
      assert(r2.ok && r2.rating.compositeText === "8.000" && r2.rating.contributed === "ya", "a model that contributed to the piece may rate (flagged as contributed)");
      res = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(res.count === 2 && res.meanText === "8.250" && res.meetsThreshold === true, "the mean of 8.500 and 8.000 is 8.250");
      const r3 = await addRating(trx, { snapshotId: first.snapshot.id, reviewerLabel: "ChatGPT C", raw: answer(code, all("7")), by: "ujian" });
      res = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(r3.ok && res.count === 3 && res.meanText === "7.833" && res.meetsThreshold === false, "a third, lower rating pulls the mean to 7.833 and it no longer qualifies");

      console.log("\nOther models are kept but not counted");
      const grok = await addRating(trx, { snapshotId: first.snapshot.id, raw: answer(code, all("9")).replace("MODEL: Model Ujian", "MODEL: Grok 4.5"), by: "ujian" });
      assert(grok.ok && grok.rating.reviewerLabel === "Grok 4.5", "a rating by Grok is accepted and named after its own MODEL line", grok);
      res = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(res.count === 3 && res.meanText === "7.833", "but it is not counted in the official mean (ChatGPT only)");
      const sup = supplementaryResult(await ratingsOf(trx, first.snapshot.id));
      assert(sup.count === 1 && sup.meanText === "9.000", "it is shown separately as supplementary");

      console.log("\nRefused answers are kept");
      const wrongCode = await addRating(trx, { snapshotId: first.snapshot.id, reviewerLabel: "Model D", raw: answer("PNL-ZZZZZZZZ", {}), by: "ujian" });
      assert(!wrongCode.ok && wrongCode.errors.some((e) => /KOD/.test(e)), "an answer with another piece's code is refused");
      const kept = await ratingsOf(trx, first.snapshot.id);
      assert(kept.length === 5 && kept.filter((r) => r.status === "invalid").length === 1, "but it is kept as an invalid row with its reasons");
      res = resultOf(kept);
      assert(res.count === 3, "and it does not count");
      const fake = await addRating(trx, { snapshotId: first.snapshot.id, reviewerLabel: "ChatGPT E", raw: answer(code, { K4: "9", B4: '"Dia menangis sepanjang malam"' }), by: "ujian" });
      assert(fake.ok && fake.rating.evidenceFlagged && fake.rating.warnings.some((w) => /K4/.test(w)), "a fabricated quote is accepted but flagged");

      console.log("\nVoiding");
      assert(await voidRating(trx, fake.ok ? fake.rating.id : "", "Petikan palsu, tidak dipercayai", "ujian"), "a rating is voided with a reason");
      let threw = false; try { await voidRating(trx, r1.ok ? r1.rating.id : "", "  ", "ujian"); } catch { threw = true; }
      assert(threw, "a void without a reason is refused");
      res = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(res.count === 3, "a voided rating no longer counts");
      let blocked = false;
      await sql`SAVEPOINT guard`.execute(trx);
      try { await sql`UPDATE panel_ratings SET voided_at = now() WHERE id = ${r1.ok ? r1.rating.id : ""}`.execute(trx); } catch { blocked = true; await sql`ROLLBACK TO SAVEPOINT guard`.execute(trx); }
      assert(blocked, "the database itself refuses a void with no reason");

      console.log("\nTimeline and extras");
      const rsAll = await ratingsOf(trx, first.snapshot.id);
      const tl = timeline(rsAll);
      assert(tl.length === 5 && tl[0]!.meanText === "8.500" && tl[1]!.meanText === "8.250" && tl[2]!.meanText === "7.833" && tl[3]!.what.startsWith("Ditambah: ChatGPT E") && tl[4]!.what.startsWith("Dibatalkan: ChatGPT E") && tl[4]!.meanText === "7.833", "the timeline replays each add and void with the mean right after it", tl.map((t) => `${t.what} ${t.meanText}`));
      const ex = extrasOf(rsAll);
      assert(ex.low === "7.000" && ex.high === "8.500" && ex.providers.length === 1 && ex.unknownProvider === 2 && ex.contributedYes === 1, "extras: spread, providers, unknown providers and contributors", ex);

      console.log("\nStale, and a new snapshot for new text");
      await trx.updateTable("works").set({ body: BODY + " Dia akhirnya berhenti menunggu." }).where("id", "=", id).execute();
      let cands = await listCandidates(trx);
      let mine = cands.find((c) => c.id === id)!;
      assert(mine.eligible && mine.stale && mine.snapshotId === first.snapshot.id, "after an edit the piece is stale against its snapshot");
      const second = await ensureSnapshot(trx, "work", id, "ujian");
      assert(!("error" in second) && second.created && second.snapshot.id !== first.snapshot.id && second.snapshot.ref_code !== code, "a new snapshot with its own code is made for the new text");
      cands = await listCandidates(trx);
      mine = cands.find((c) => c.id === id)!;
      assert(!mine.stale && mine.snapshotId === (second as { snapshot: { id: string } }).snapshot.id && mine.ratingCount === 0, "the new snapshot starts with no ratings");
      const oldStill = resultOf(await ratingsOf(trx, first.snapshot.id));
      assert(oldStill.count === 3 && oldStill.meanText === "7.833", "the old ratings are untouched and still describe the old text");
      const oldCodeOnNew = await addRating(trx, { snapshotId: (second as { snapshot: { id: string } }).snapshot.id, reviewerLabel: "Model F", raw: answer(code, {}), by: "ujian" });
      assert(!oldCodeOnNew.ok, "an answer made for the old version is refused on the new one");

      console.log("\nWhat is not eligible");
      const fragId = `panel-check-frag-${Date.now()}`;
      await trx.insertInto("works").values({ id: fragId, slug: fragId, title: "Sekeping", type: "fragmen", status: "draft", body: "Teks.", version: "1.0", revision_count: 0, editorial_history: "{}", metadata: null, reader: null } as never).execute();
      const frag = await ensureSnapshot(trx, "work", fragId, "ujian");
      assert("error" in frag, "a fragmen is refused");
      const novelaId = `panel-check-nov-${Date.now()}`;
      await trx.insertInto("works").values({ id: novelaId, slug: novelaId, title: "Novela Ujian", type: "novela", status: "draft", body: null, version: "1.0", revision_count: 0, editorial_history: "{}", metadata: null, reader: null } as never).execute();
      const empty = await assemble(trx, "work", novelaId);
      assert("error" in empty, "a work with no text is refused");
      await sql`INSERT INTO reading_sections (work_id, slug, title, position, body) VALUES (${novelaId}, 'a', 'Satu', 1, 'Bahagian pertama novela ini cukup panjang untuk diuji.'), (${novelaId}, 'b', 'Dua', 2, 'Bahagian kedua mengikuti dan menutup cerita itu.')`.execute(trx);
      const nov = await assemble(trx, "work", novelaId);
      assert(!("error" in nov) && /2 bahagian/.test(nov.coverage) && nov.text.includes("## Bahagian 1: Satu") && nov.text.indexOf("pertama") < nov.text.indexOf("kedua"), "a novela is assembled from its sections in order, with a coverage line", nov);

      throw new Undo();
    });
  } catch (error) {
    if (!(error instanceof Undo)) { failed++; console.error("  ✗ unexpected error:", error); }
  } finally {
    const left = await sql<{ n: string }>`SELECT count(*) AS n FROM works WHERE id LIKE 'panel-check-%'`.execute(db);
    console.log(`\n(rolled back; rows left behind: ${left.rows[0]?.n})`);
    await closeDb();
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed) process.exit(1);
}
void main();
