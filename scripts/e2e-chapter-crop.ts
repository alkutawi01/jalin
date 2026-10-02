/**
 * End-to-end check of chapter images and the crop against a running dev server on a test database that has
 * migration 022 applied. Not part of npm test: it needs a server and a database.
 *   E2E_BASE=http://localhost:3100 npx tsx scripts/e2e-chapter-crop.ts <workId>
 * The work must be a novela with chapters bab-2 and bab-3.
 */
import sharp from "sharp";

const BASE = process.env.E2E_BASE ?? "http://localhost:3100";
const WORK = process.argv[2] ?? "JLN-NOV-9991";
let failures = 0;
const check = (ok: boolean, msg: string) => {
  if (ok) console.log(`  ✓ ${msg}`);
  else { failures += 1; console.error(`  ✗ ${msg}`); }
};

async function api(method: string, path: string, body?: unknown, form?: FormData) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: form ? undefined : { "Content-Type": "application/json" },
    body: form ?? (body === undefined ? undefined : JSON.stringify(body))
  });
  const text = await res.text();
  let data: any = text;
  try { data = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, ok: res.ok, data };
}

async function png(r: number, g: number, b: number) {
  return sharp({ create: { width: 1200, height: 800, channels: 3, background: { r, g, b } } }).png().toBuffer();
}

async function upload(fields: Record<string, string>, color: [number, number, number]) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  form.set("file", new File([new Uint8Array(await png(...color))], "ujian.png", { type: "image/png" }));
  return api("POST", `/api/admin/works/${WORK}/visuals/upload`, undefined, form);
}

async function visuals() {
  return (await api("GET", `/api/admin/visuals?workId=${WORK}`)).data as Array<{ id: number; role: string; src: string; anchor: string | null; section_slug: string | null; focus_x: number | null; focus_y: number | null; zoom: number | null }>;
}

async function chapter(slug: string) {
  const res = await fetch(`${BASE}/kategori/novela/${(await api("GET", `/api/admin/works/${WORK}`)).data.slug}/${slug}`);
  return res.text();
}

async function main() {
  console.log(`\n=== Gambar bab dan crop (${WORK}) ===`);
  const before = await visuals();
  const novelaHeroes = before.filter((v) => v.role === "hero").length;

  // chapter hero
  let r = await upload({ role: "section", sectionSlug: "bab-2", alt: "", tool: "Ujian" }, [200, 40, 40]);
  check(r.status === 201, `hero bab-2 dimuat naik tanpa alt (${r.status} ${r.data?.error ?? ""})`);
  r = await upload({ role: "section", sectionSlug: "bab-2", alt: "", tool: "Ujian" }, [200, 40, 40]);
  check(r.status === 409, "hero kedua untuk bab yang sama ditolak");
  let all = await visuals();
  const hero = all.find((v) => v.role === "section" && v.section_slug === "bab-2" && !v.anchor);
  check(Boolean(hero), "hero bab direkodkan dengan section_slug");
  check(all.filter((v) => v.role === "hero").length === novelaHeroes, "hero Novela tidak terjejas");

  // crop
  r = await api("PATCH", `/api/admin/visuals/${hero!.id}`, { focusX: 20, focusY: 70, zoom: 150 });
  check(r.ok, `crop disimpan (${r.status} ${r.data?.error ?? ""})`);
  all = await visuals();
  const cropped = all.find((v) => v.id === hero!.id)!;
  check(cropped.focus_x === 20 && cropped.focus_y === 70 && cropped.zoom === 150, "crop dibaca semula daripada pangkalan data");
  r = await api("PATCH", `/api/admin/visuals/${hero!.id}`, { alt: "Ujian alt" });
  all = await visuals();
  check(all.find((v) => v.id === hero!.id)!.focus_x === 20, "menyimpan butiran lain tidak mengosongkan crop");
  r = await api("PATCH", `/api/admin/visuals/${hero!.id}`, { focusX: 500, focusY: -3, zoom: 900 });
  all = await visuals();
  const clamped = all.find((v) => v.id === hero!.id)!;
  check(clamped.focus_x === 100 && clamped.focus_y === 0 && clamped.zoom === 300, "nilai crop dihadkan kepada julat sah");
  await api("PATCH", `/api/admin/visuals/${hero!.id}`, { focusX: 20, focusY: 70, zoom: 150 });

  // inline image in a chapter, numbering per chapter
  const sections = (await api("GET", `/api/admin/works/${WORK}/sections`)).data as Array<{ id: number; slug: string; body: string }>;
  const bab2 = sections.find((s) => s.slug === "bab-2")!;
  const bab3 = sections.find((s) => s.slug === "bab-3")!;
  const withMarker = (body: string) => body.replace(/\n\n/, "\n\n[[gambar:1]]\n\n");
  await api("PATCH", `/api/admin/works/${WORK}/sections/${bab2.id}`, { body: withMarker(bab2.body) });
  await api("PATCH", `/api/admin/works/${WORK}/sections/${bab3.id}`, { body: withMarker(bab3.body) });
  r = await upload({ role: "inline", sectionSlug: "bab-2", anchor: "[[gambar:1]]", alt: "", tool: "Ujian" }, [40, 160, 60]);
  check(r.status === 201, `gambar dalam teks bab-2 dengan [[gambar:1]] (${r.status} ${r.data?.error ?? ""})`);
  r = await upload({ role: "inline", sectionSlug: "bab-3", anchor: "[[gambar:1]]", alt: "", tool: "Ujian" }, [40, 60, 160]);
  check(r.status === 201, `bab-3 boleh guna [[gambar:1]] sendiri (${r.status} ${r.data?.error ?? ""})`);
  r = await upload({ role: "inline", sectionSlug: "bab-2", anchor: "[[gambar:1]]", alt: "", tool: "Ujian" }, [1, 2, 3]);
  check(r.status === 409, "penanda yang sama dalam bab yang sama ditolak");
  r = await upload({ role: "inline", sectionSlug: "bab-2", anchor: "[[gambar:7]]", alt: "", tool: "Ujian" }, [1, 2, 3]);
  check(r.status === 400, "penanda yang tiada dalam teks bab ditolak");

  // A published novela shows its frozen version, so publish again before looking at the public pages.
  r = await api("POST", `/api/admin/works/${WORK}/publish`, { republish: true, summary: "Ujian gambar bab", changeType: "minor" });
  check(r.ok, `terbit semula (${r.status} ${r.data?.error ?? ""})`);
  // the public repository refreshes every 30 seconds
  console.log("  … menunggu 35 saat supaya laman awam memuat semula");
  await new Promise((resolve) => setTimeout(resolve, 35000));
  const html2 = await chapter("bab-2");
  check(hero ? html2.includes(hero.src.split("/").pop()!) : false, "bab-2 memaparkan hero bab sendiri");
  const html3 = await chapter("bab-3");
  const novelaHero = all.find((v) => v.role === "hero");
  check(novelaHero ? html3.includes(novelaHero.src.split("/").pop()!) : false, "bab-3 (tiada hero sendiri) memaparkan hero Novela sebagai fallback");
  const inlineImgs = (await visuals()).filter((v) => v.section_slug === "bab-2" && v.anchor);
  check(inlineImgs.length === 1 && html2.includes(inlineImgs[0]!.src.split("/").pop()!), "gambar dalam teks bab-2 dipaparkan dalam bab-2");
  check(inlineImgs.length === 1 && !html3.includes(inlineImgs[0]!.src.split("/").pop()!), "gambar dalam teks bab-2 tidak bocor ke bab-3");
  check(/object-position:\s*20% 70%/.test(html2), "laman bab memaparkan crop (object-position 20% 70%)");
  check(/scale\(1\.5\)/.test(html2), "laman bab memaparkan zum 1.5×");

  // clean up what this script added
  for (const v of await visuals()) if (v.section_slug) await api("DELETE", `/api/admin/visuals/${v.id}`);
  await api("PATCH", `/api/admin/works/${WORK}/sections/${bab2.id}`, { body: bab2.body });
  await api("PATCH", `/api/admin/works/${WORK}/sections/${bab3.id}`, { body: bab3.body });

  if (failures) { console.error(`\n${failures} semakan gagal`); process.exit(1); }
  console.log("\nSemua semakan lulus");
}
main().catch((e) => { console.error(e); process.exit(1); });
