/**
 * End-to-end editor flow against a RUNNING app and a THROWAWAY database (never production).
 *
 *   ADMIN_DEV_BYPASS=true npm run dev            (with DATABASE_URL pointing at a test branch)
 *   E2E_BASE=http://localhost:3000 npx tsx scripts/e2e-editor-flow.ts [cerpen|fragmen|bersiri|all]
 *
 * NOTE: needs CONTENT_SOURCE=database in the app so the public pages read the test database.
 * Uploaded images land on local disk in dev, so the script gives them a durable-looking address
 * (production uses object storage) — this is a simulation of that one step.
 *
 * It drives the same admin APIs the screens use: new draft → text → credits → glossary → upload and
 * replace an image → move the image marker → preview data → ready → publish → the public site shows the
 * published version → a later edit stays draft → republish shows the new version. Test works are archived.
 */
import { config } from "dotenv";
if (process.env.AUDIT_ENV) config({ path: process.env.AUDIT_ENV, override: true });
import sharp from "sharp";
import { promises as fs } from "node:fs";
import { getDb, closeDb } from "../src/lib/db";

const BASE = process.env.E2E_BASE ?? "http://localhost:3000";
const REFRESH_WAIT_MS = Number(process.env.E2E_REFRESH_MS ?? 36000);
let failures = 0;
const created: string[] = [];

function check(ok: boolean, msg: string) {
  if (ok) console.log(`  ✓ ${msg}`);
  else {
    failures += 1;
    console.error(`  ✗ ${msg}`);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function api(method: string, path: string, body?: unknown, form?: FormData) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: form ? undefined : { "Content-Type": "application/json" },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body))
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

async function png(color: { r: number; g: number; b: number }) {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: color } }).png().toBuffer();
}

async function upload(workId: string, fields: Record<string, string>, color: { r: number; g: number; b: number }) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set("file", new File([new Uint8Array(await png(color))], "ujian.png", { type: "image/png" }));
  return api("POST", `/api/admin/works/${workId}/visuals/upload`, undefined, form);
}

/**
 * In dev the uploaded files land on local disk, which readiness (rightly) refuses as a public address.
 * Production stores them in durable object storage; here we give each uploaded image a durable-looking
 * address so the rest of the flow can be exercised.
 */
async function simulateDurableStorage(workId: string) {
  const db = getDb();
  const rows = await db.selectFrom("visuals").where("work_id", "=", workId).select(["id", "src"]).execute();
  for (const row of rows) {
    if (!/^https:/.test(row.src)) {
      await db.updateTable("visuals").where("id", "=", row.id)
        .set({ src: `https://hinxqignbwjdoi92.public.blob.vercel-storage.com/assets/visuals/e2e-${row.id}.png`, is_asset_finalized: true } as never).execute();
    }
  }
}

async function readiness(id: string) {
  const r = await api("GET", `/api/admin/works/${id}/publication-readiness`);
  const blockers: { code: string; message: string }[] = r.data?.blockers ?? [];
  return { ...r.data, codes: blockers.filter((b) => b.code !== "status_not_publishable").map((b) => b.code) as string[] };
}

async function publicHtml(path: string) {
  const res = await fetch(`${BASE}${path}`);
  return { status: res.status, html: await res.text() };
}

async function waitForPublic(path: string, pred: (html: string) => boolean, ms = 60000) {
  const end = Date.now() + ms;
  let last = { status: 0, html: "" };
  while (Date.now() < end) {
    last = await publicHtml(path);
    if (last.status === 200 && pred(last.html)) return last;
    await sleep(4000);
  }
  return last;
}

const suffix = Date.now().toString(36);

async function newDraft(type: string, extra: Record<string, unknown> = {}) {
  const r = await api("POST", "/api/admin/works/start-draft", { type, ...extra });
  check(r.ok && !!r.data?.id, `draf ${type} dicipta`);
  const id = r.data.id as string;
  created.push(id);
  return id;
}

async function addCredit(workId: string, role: string, name: string, byline = true, sort = 0) {
  const r = await api("POST", "/api/admin/credits", { workId, guestName: name, roleLabel: role, byline, isPublic: true, sortOrder: sort });
  check(r.ok, `kredit ${role} (${name}) ditambah`);
}

async function flowCerpen() {
  console.log("\n=== Cerpen: cipta → terbit → sunting semula ===");
  const id = await newDraft("cerpen");
  const slug = `uji-e2e-cerpen-${suffix}`;
  const v1 = `Versi satu ujian ${suffix}. Perenggan pertama bercerita tentang hujan yang turun di atas zink bengkel.`;
  const body = (marker: "awal" | "akhir", first: string) =>
    marker === "awal"
      ? `${first}\n\n[[gambar:1]]\n\nPerenggan kedua tentang kereta yang sukar hidup.\n\nPerenggan ketiga tentang pulang.`
      : `${first}\n\nPerenggan kedua tentang kereta yang sukar hidup.\n\n[[gambar:1]]\n\nPerenggan ketiga tentang pulang.`;
  let r = await api("PATCH", `/api/admin/works/${id}`, { title: `Cerpen Uji ${suffix}`, slug, body: body("awal", v1), dek: "Dek ujian cerpen.", genre: "Keluarga", audience: "remaja", readingMinutes: 3 });
  check(r.ok, `metadata dan teks disimpan (${r.status} ${typeof r.data === "object" ? r.data?.error ?? "" : ""})`);

  await addCredit(id, "initial_draft", "Aina Zulaikha", true, 0);
  r = await api("POST", "/api/admin/glossary", { workId: id, term: "zink", meaning: "Kepingan logam nipis untuk bumbung.", source: "Kamus Dewan", sortOrder: 0 });
  check(r.ok, "istilah glosari ditambah");

  const hero = await upload(id, { role: "hero", alt: "Bengkel kecil pada waktu pagi.", tool: "Ujian" }, { r: 40, g: 80, b: 120 });
  check(hero.ok, `gambar utama dimuat naik (${hero.status} ${hero.data?.error ?? ""})`);
  const inline = await upload(id, { role: "inline", alt: "Hujan di atas bumbung zink.", anchor: "[[gambar:1]]", place: "after", tool: "Ujian" }, { r: 120, g: 80, b: 40 });
  check(inline.ok, `gambar dalam teks dimuat naik pada penanda (${inline.status} ${inline.data?.error ?? ""})`);

  const rep = new FormData();
  rep.set("file", new File([new Uint8Array(await png({ r: 200, g: 60, b: 60 }))], "ganti.png", { type: "image/png" }));
  rep.set("alt", "Hujan lebat di atas bumbung zink.");
  const replaced = await api("POST", `/api/admin/visuals/${inline.data?.visualId}/replace`, undefined, rep);
  check(replaced.ok, `gambar diganti (${replaced.status} ${replaced.data?.error ?? ""})`);

  // Move the marker: allowed while it still appears exactly once.
  r = await api("PATCH", `/api/admin/works/${id}`, { body: body("akhir", v1) });
  check(r.ok, "penanda gambar dialih ke perenggan lain");
  r = await api("PATCH", `/api/admin/works/${id}`, { body: body("akhir", v1).replace("[[gambar:1]]", "") });
  check(!r.ok, "membuang penanda yang masih digunakan gambar ditolak");

  await simulateDurableStorage(id);
  const before = await readiness(id);
  check(before.codes.length === 0, `semakan: tiada sekatan selain status (${before.codes.join(",")})`);
  r = await api("PATCH", `/api/admin/works/${id}`, { status: "ready" });
  check(r.ok, "status ditetapkan Sedia");
  r = await api("POST", `/api/admin/works/${id}/publish`);
  check(r.ok, `diterbitkan (${r.status} ${r.data?.error ?? ""})`);

  const path = `/kategori/cerpen/${slug}`;
  let pub = await waitForPublic(path, (h) => h.includes(`Versi satu ujian ${suffix}`));
  check(pub.status === 200 && pub.html.includes(`Versi satu ujian ${suffix}`), `laman awam memaparkan versi terbit (status ${pub.status}, ${pub.html.length} bait, ${path})`);
  check(!pub.html.includes("Pengarang asal"), "cerpen asli tidak memaparkan jadual sumber");

  const v2 = `Versi dua ujian ${suffix}, draf baharu yang belum diterbitkan.`;
  r = await api("PATCH", `/api/admin/works/${id}`, { body: body("akhir", v2), dek: "Dek draf baharu." });
  check(r.ok, "suntingan selepas terbit disimpan sebagai draf");
  const state = await readiness(id);
  check(state.unpublished?.changed === true, "papan status menyatakan ada perubahan belum diterbitkan");
  console.log(`  … menunggu ${Math.round(REFRESH_WAIT_MS / 1000)} saat supaya laman awam sempat memuat semula`);
  await sleep(REFRESH_WAIT_MS);
  pub = await publicHtml(path);
  check(pub.status === 200 && pub.html.includes(`Versi satu ujian ${suffix}`) && !pub.html.includes(`Versi dua ujian ${suffix}`), `suntingan belum bocor ke laman awam (status ${pub.status}, v1=${pub.html.includes(`Versi satu ujian ${suffix}`)}, v2=${pub.html.includes(`Versi dua ujian ${suffix}`)})`);

  if (process.env.E2E_STOP_AFTER_EDIT) { await fs.writeFile(process.env.TEMP + "/leak.html", pub.html); console.log("  · berhenti sebelum terbit semula:", slug); return; }
  r = await api("POST", `/api/admin/works/${id}/publish`, { republish: true, summary: "Ujian terbit semula", changeType: "minor" });
  check(r.ok && r.data?.changed === true, `terbit semula (${r.status} ${r.data?.error ?? ""})`);
  pub = await waitForPublic(path, (h) => h.includes(`Versi dua ujian ${suffix}`), 90000);
  check(pub.html.includes(`Versi dua ujian ${suffix}`), "selepas terbit semula laman awam memaparkan versi baharu");
}

async function fragmenBase(label: string, originalLanguage: string) {
  const id = await newDraft("fragmen");
  const slug = `uji-e2e-fragmen-${label}-${suffix}`;
  await api("PATCH", `/api/admin/works/${id}`, { title: `Fragmen ${label} ${suffix}`, slug, body: "Petikan pendek dalam bahasa Melayu untuk ujian.", dek: "Dek.", genre: "Klasik", audience: "remaja", readingMinutes: 1 });
  await addCredit(id, "initial_draft", "Aina Zulaikha", true, 0);
  const hero = await upload(id, { role: "hero", alt: "Ilustrasi petikan.", tool: "Ujian" }, { r: 30, g: 90, b: 60 });
  check(hero.ok, "gambar utama fragmen dimuat naik");
  await simulateDurableStorage(id);
  const r = await api("PUT", `/api/admin/works/${id}/source-rights`, {
    fragmenTextLanguage: "Bahasa Melayu",
    originalTitle: `Karya Asal ${label} ${suffix}`, author: "Pengarang Klasik", originalLanguage,
    sourceUrl: "https://example.org/sumber", sourceLocator: "Bab 1", sourceTextBasis: originalLanguage.includes("Melayu") ? "" : "Terjemahan editor Jalin daripada edisi 1910.",
    publicationYear: 1910
  });
  check(r.ok, `maklumat sumber disimpan (${r.status} ${r.data?.error ?? ""})`);
  return { id, slug };
}

async function flowFragmen() {
  console.log("\n=== Fragmen asal (tidak diterjemah) ===");
  const asal = await fragmenBase("asal", "Bahasa Melayu");
  let s = await readiness(asal.id);
  check(s.codes.includes("fragmen_text_unreviewed"), "sekat: pengesahan manusia bahawa teks BM belum dibuat");
  let r = await api("POST", `/api/admin/works/${asal.id}/source-rights/text-review`, { confirmed: true });
  check(r.ok, "editor mengesahkan teks ialah Bahasa Melayu");
  r = await api("POST", `/api/admin/works/${asal.id}/source-rights/rights-review`, { rights_status: "public_domain", rights_notes: "Domain awam: pengarang meninggal lebih 70 tahun lalu.", rights_evidence: "Rekod perpustakaan negara.", fragmenTextLanguage: "Bahasa Melayu" });
  check(r.ok, `semakan hak direkod (${r.status} ${r.data?.error ?? ""})`);
  s = await readiness(asal.id);
  check(s.codes.length === 0, `fragmen asal siap diterbitkan (${s.codes.join(",")})`);
  await api("PATCH", `/api/admin/works/${asal.id}`, { body: "Petikan diubah selepas pengesahan." });
  s = await readiness(asal.id);
  check(s.codes.includes("fragmen_text_changed_after_review"), "mengubah teks menarik balik pengesahan bahasa");

  console.log("\n=== Fragmen terjemahan ===");
  const ter = await fragmenBase("terjemahan", "Bahasa Inggeris");
  await api("POST", `/api/admin/works/${ter.id}/source-rights/text-review`, { confirmed: true });
  await api("POST", `/api/admin/works/${ter.id}/source-rights/rights-review`, { rights_status: "public_domain", rights_notes: "Domain awam.", rights_evidence: "Rekod.", fragmenTextLanguage: "Bahasa Melayu" });
  s = await readiness(ter.id);
  check(s.codes.includes("fragmen_translator_missing"), "sekat: kredit penterjemah diperlukan untuk terjemahan");
  await addCredit(ter.id, "penterjemah", "Nur Hidayah", false, 1);
  s = await readiness(ter.id);
  check(s.codes.length === 0, `fragmen terjemahan siap diterbitkan (${s.codes.join(",")})`);

  console.log("\n=== Karya sumber sama dalam dua jenis ===");
  const sin = await newDraft("sinopsis");
  await api("PATCH", `/api/admin/works/${sin}`, { title: `Sinopsis ${suffix}`, slug: `uji-e2e-sinopsis-${suffix}`, body: "Sinopsis ringkas ujian.", dek: "Dek.", genre: "Klasik", audience: "remaja", readingMinutes: 1 });
  const put = await api("PUT", `/api/admin/works/${sin}/source-rights`, { originalTitle: `Karya Asal asal ${suffix}`.toUpperCase(), author: "pengarang klasik", originalLanguage: "Bahasa Melayu", sourceUrl: "https://example.org/sumber" });
  check(put.ok, `sumber sinopsis disimpan (${put.status} ${put.data?.error ?? ""})`);
  s = await readiness(sin);
  check(Boolean(s.warnings?.some((w: { code: string }) => w.code === "source_cross_type_pending")), `amaran awal: sumber sama sedang disediakan sebagai Fragmen (${(s.warnings ?? []).map((w: { code: string }) => w.code).join(",")})`);
}

async function flowBersiri() {
  console.log("\n=== Bersiri: episod dalam siri ===");
  const id = await newDraft("bersiri", { newSeriesTitle: `Siri Uji ${suffix}` });
  const slug = `uji-e2e-episod-${suffix}`;
  let r = await api("PATCH", `/api/admin/works/${id}`, { title: `Episod Satu ${suffix}`, slug, body: "Episod pertama siri ujian.", dek: "Dek episod.", genre: "Misteri", audience: "remaja", readingMinutes: 2 });
  check(r.ok, "episod disimpan");
  await addCredit(id, "initial_draft", "Aina Zulaikha", true, 0);
  const hero = await upload(id, { role: "hero", alt: "Lorong sunyi.", tool: "Ujian" }, { r: 60, g: 60, b: 90 });
  check(hero.ok, "gambar utama episod dimuat naik");
  await simulateDurableStorage(id);
  const s = await readiness(id);
  check(s.codes.length === 0, `episod siap diterbitkan (${s.codes.join(",")})`);
  await api("PATCH", `/api/admin/works/${id}`, { status: "ready" });
  r = await api("POST", `/api/admin/works/${id}/publish`);
  check(r.ok, `episod diterbitkan (${r.status} ${r.data?.error ?? ""})`);
  const series = (await api("GET", "/api/admin/series")).data as { id: string; slug: string; title: string }[];
  const mine = series.find((x) => x.title === `Siri Uji ${suffix}`);
  check(!!mine, "siri wujud");
  if (mine) {
    const page = await waitForPublic(`/kategori/bersiri/${mine.slug}/${slug}`, (h) => h.includes("Episod pertama siri ujian"), 90000);
    check(page.status === 200 && page.html.includes("Episod pertama siri ujian"), "halaman episod awam memaparkan episod");
    // Two more episodes in the same series, so the title page has a first and a latest episode.
    for (const n of [2, 3]) {
      const eid = await newDraft("bersiri", { seriesId: mine.id });
      await api("PATCH", `/api/admin/works/${eid}`, { title: `Episod ${n} ${suffix}`, slug: `uji-e2e-episod-${n}-${suffix}`, body: `Isi episod ${n} siri ujian.`, dek: `Dek episod ${n}.`, genre: "Misteri", audience: "remaja", readingMinutes: 2 });
      await addCredit(eid, "initial_draft", "Aina Zulaikha", true, 0);
      await upload(eid, { role: "hero", alt: "Lorong sunyi.", tool: "Ujian" }, { r: 60, g: 60, b: 90 });
      await simulateDurableStorage(eid);
      await api("PATCH", `/api/admin/works/${eid}`, { status: "ready" });
      const pr = await api("POST", `/api/admin/works/${eid}/publish`);
      check(pr.ok, `episod ${n} diterbitkan (${pr.status} ${pr.data?.error ?? ""})`);
    }
    const seriesPage = await waitForPublic(`/kategori/bersiri/${mine.slug}`, (h) => h.includes(`Episod 3 ${suffix}`) || h.includes(`Episod 3`), 90000);
    check(seriesPage.status === 200 && seriesPage.html.includes(`Episod Satu ${suffix}`), "halaman siri menyenaraikan episod");
    check(seriesPage.html.replace(/<!-- -->/g, "").includes("Mula Episod 1") && seriesPage.html.includes("Episod terkini"), "halaman siri ada dua laluan: Mula Episod 1 dan Episod terkini");
    check(seriesPage.html.includes(`/${mine.slug}/uji-e2e-episod-3-${suffix}`), "Episod terkini menuju episod terakhir");
    const plain = (h: string) => h.replace(/<!-- -->/g, "");
    check(plain(seriesPage.html).includes("episode-card"), "episod dipaparkan sebagai kad");
    check(!seriesPage.html.includes("series-hero"), "tanpa gambar siri, halaman kekal bertipografi");

    // Series illustration (needs migration 020 on the database; skipped with a note when it has not run).
    const heroForm = new FormData();
    heroForm.set("file", new File([new Uint8Array(await png({ r: 90, g: 60, b: 50 }))], "siri.png", { type: "image/png" }));
    heroForm.set("alt", "Ilustrasi siri ujian.");
    const heroRes = await api("POST", `/api/admin/series/${mine.id}/hero`, undefined, heroForm);
    if (heroRes.status === 409) {
      console.log("  · gambar siri dilangkau: migrasi 020 belum dijalankan pada pangkalan data ini");
    } else {
      check(heroRes.ok, `gambar siri dimuat naik (${heroRes.status} ${heroRes.data?.error ?? ""})`);
      const withHero = await waitForPublic(`/kategori/bersiri/${mine.slug}`, (h) => h.includes("series-hero"), 90000);
      check(withHero.html.includes("series-hero"), "halaman siri memaparkan gambar siri");
    }

    const ep2 = await publicHtml(`/kategori/bersiri/${mine.slug}/uji-e2e-episod-2-${suffix}`);
    const ep2Text = plain(ep2.html);
    check(ep2Text.includes("Episod 2 daripada 3") && ep2Text.includes(`href="/kategori/bersiri/${mine.slug}"`) && ep2Text.includes('href="/kategori/bersiri"'), "halaman episod ada jejak undur: Bersiri / siri / episod");
    check(ep2Text.includes("continue-next") && ep2Text.includes(`Episod 3 ${suffix}`) && ep2Text.includes("Semua episod"), "bar bawah: Seterusnya dengan tajuk, dan Semua episod");
    check(!ep2Text.includes("episode-nav"), "tiada bar navigasi di atas cerita");
    const ep3 = plain((await publicHtml(`/kategori/bersiri/${mine.slug}/uji-e2e-episod-3-${suffix}`)).html);
    check(ep3.includes("episod terkini") || ep3.includes("Ini episod terkini"), "episod terakhir menyatakan ia episod terkini");
    const home = await publicHtml("/");
    check(home.html.includes(`/kategori/bersiri/${mine.slug}`), "halaman utama menyorot siri dengan pautan ke halaman siri");
  }
}

async function flowSumber() {
  console.log("\n=== Cerpen daripada sumber lain: jadual naskhah ===");
  const id = await newDraft("cerpen");
  const slug = `uji-e2e-sumber-${suffix}`;
  let r = await api("PATCH", `/api/admin/works/${id}`, { title: `Cerpen Sumber ${suffix}`, slug, body: `Isi cerpen daripada sumber lain ${suffix}.`, dek: "Dek.", genre: "Klasik", audience: "remaja", readingMinutes: 1 });
  check(r.ok, "cerpen disimpan");
  await addCredit(id, "initial_draft", "Aina Zulaikha", true, 0);
  const hero = await upload(id, { role: "hero", alt: "Ilustrasi cerpen.", tool: "Ujian" }, { r: 90, g: 40, b: 40 });
  check(hero.ok, "gambar utama dimuat naik");
  await simulateDurableStorage(id);

  let s = await readiness(id);
  check(s.codes.length === 0, `cerpen asli tidak memerlukan sumber (${s.codes.join(",")})`);
  r = await api("PUT", `/api/admin/works/${id}/source-rights`, { originalTitle: "Salina" });
  check(!r.ok, "cerpen asli tidak boleh menyimpan maklumat sumber");

  r = await api("PATCH", `/api/admin/works/${id}`, { origin: "sumber" });
  check(r.ok, "cerpen ditanda 'daripada sumber lain'");
  s = await readiness(id);
  check(s.codes.includes("source_missing"), "sekat: cerpen daripada sumber lain memerlukan rekod sumber");

  r = await api("PUT", `/api/admin/works/${id}/source-rights`, {
    originalTitle: `Salina ${suffix}`, author: "A. Samad Said", originalLanguage: "Bahasa Melayu",
    publicationYear: 1961, publisher: "Dewan Bahasa dan Pustaka", editionYear: 1991, printing: "Cetakan ketiga",
    editorName: "Penyunting Ujian", sourceLocator: "ms. 12-14", chatbotFields: ["publisher", "editionYear"]
  });
  check(r.ok, `butiran naskhah disimpan (${r.status} ${r.data?.error ?? ""})`);
  let view = (await api("GET", `/api/admin/works/${id}/source-rights`)).data;
  check(view?.chatbotFilledFields?.includes("publisher") && view.chatbotFilledFields.includes("editionYear"), "medan yang diisi chatbot ditanda");
  r = await api("PUT", `/api/admin/works/${id}/source-rights`, { isbn: "978-967-0000-00-0" });
  view = (await api("GET", `/api/admin/works/${id}/source-rights`)).data;
  check(r.ok && view?.sourceWork?.originalTitle === `Salina ${suffix}` && view.sourceWork.publisher === "Dewan Bahasa dan Pustaka" && view.sourceWork.isbn === "978-967-0000-00-0", "menyimpan satu medan tidak mengosongkan medan lain");

  r = await api("POST", `/api/admin/works/${id}/source-rights/rights-review`, { rights_status: "public_domain", rights_notes: "Domain awam: pengarang meninggal lebih 70 tahun lalu.", rights_evidence: "Rekod perpustakaan negara." });
  check(r.ok, `semakan hak direkod (${r.status} ${r.data?.error ?? ""})`);
  view = (await api("GET", `/api/admin/works/${id}/source-rights`)).data;
  check((view?.chatbotFilledFields ?? []).length === 0, "tanda chatbot hilang selepas semakan hak oleh editor");
  s = await readiness(id);
  check(s.codes.length === 0, `siap diterbitkan (${s.codes.join(",")})`);
  await api("PATCH", `/api/admin/works/${id}`, { status: "ready" });
  r = await api("POST", `/api/admin/works/${id}/publish`);
  check(r.ok, `diterbitkan (${r.status} ${r.data?.error ?? ""})`);

  const path = `/kategori/cerpen/${slug}`;
  const pub = await waitForPublic(path, (h) => h.includes("Pengarang asal"), 90000);
  const text = pub.html.replace(/<!-- -->/g, "");
  for (const needle of ["Karya asal", `Salina ${suffix}`, "Pengarang asal", "A. Samad Said", "Terbit pertama", "1961", "Penerbit", "Dewan Bahasa dan Pustaka", "Cetakan", "1991, Cetakan ketiga", "Penyunting", "Penyunting Ujian", "Lokasi petikan", "ms. 12-14"]) {
    check(text.includes(needle), `jadual 'Tentang karya' memaparkan: ${needle}`);
  }
  check(!text.includes("Penterjemah"), "baris tanpa nilai (Penterjemah) tidak dipaparkan");

  r = await api("PUT", `/api/admin/works/${id}/source-rights`, { publisher: "Penerbit Lain" });
  check(r.ok && r.data?.invalidatedApproval === true, "menukar penerbit menarik balik kelulusan hak");
}

async function cleanup() {
  if (process.env.E2E_KEEP) { console.log("  · dikekalkan:", created.join(",")); return; }
  for (const id of created) await api("PATCH", `/api/admin/works/${id}`, { status: "archived" }).catch(() => undefined);
}

async function main() {
  const which = process.argv[2] ?? "all";
  console.log(`E2E terhadap ${BASE}`);
  try {
    if (which === "cerpen" || which === "all") await flowCerpen();
    if (which === "fragmen" || which === "all") await flowFragmen();
    if (which === "sumber" || which === "all") await flowSumber();
    if (which === "bersiri" || which === "all") await flowBersiri();
  } finally {
    await cleanup();
    await closeDb?.();
  }
  if (failures) {
    console.error(`\n${failures} semakan gagal`);
    process.exit(1);
  }
  console.log("\nSemua semakan E2E lulus");
}
main().catch((e) => { console.error(e); process.exit(1); });
