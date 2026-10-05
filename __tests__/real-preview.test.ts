/**
 * The editor's preview must be the page a reader would get (Izzat: "kalau tak, itu bukan pratonton"). It used to be an admin
 * page with its own plain rendering (plain <img>, no head, no side columns, no chapter navigation). Now the public page and the
 * preview render the same components (WorkView / EpisodeView) and the preview feeds them the draft as it is saved.
 * Checked in a browser on a temporary Neon branch: a novela chapter, a series episode and an untitled draft all rendered the
 * real page with a preview bar; chapter links stayed in the preview; no structured data was written.
 */
import fs from "node:fs";
import path from "node:path";
import { workFromSnapshot } from "../src/lib/content/database-repository";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// one builder for the frozen copy and the draft
const draft = JSON.parse(JSON.stringify({
  id: "W1", slug: "uji", title: "Uji", type: "cerpen", status: "draft", genre: "Keluarga", audience: "13-17", dek: "Satu dek.",
  readingMinutes: 4, version: "v1.0", versionLabel: null, revisionCount: 0, publishedAt: null, publishedBy: null,
  body: "Perenggan satu.", credits: [{ contributor_slug: "nara-zahin", role_label: "Penulis", byline: true, is_public: true }],
  visuals: [{ role: "hero", src: "/x.png", alt: "Gambar", anchor: null, place: "after" }], glossary: [],
  metadata: { characters: [{ name: "Alia", role: "Utama" }] }, sections: [], series: null,
  updatedAt: new Date("2026-10-05T01:00:00Z")
}));
const work = workFromSnapshot(draft, "W1");
assert(work?.title === "Uji" && work.body === "Perenggan satu." && work.visuals[0]?.role === "hero", "a draft snapshot becomes a Work with its title, text and picture");
assert(work?.metadata?.characters?.[0]?.name === "Alia", "the characters come through");
assert(work?.publishedAt === null || work?.publishedAt === undefined, "an unpublished draft has no publication date (the page must cope with that)");

const story = read("src/app/kategori/[type]/[slug]/page.tsx");
assert(story.includes("<WorkView work={work}") && !story.includes("<SiteHeader"), "the public page renders the shared WorkView");
const episode = read("src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page.tsx");
assert(episode.includes("<EpisodeView work={work}") && !episode.includes("<SiteHeader"), "the public episode page renders the shared EpisodeView");

const preview = read("src/app/pratonton/[id]/page.tsx");
assert(preview.includes("<WorkView") && preview.includes("<EpisodeView") && preview.includes("buildLiveSnapshot") && preview.includes("workFromSnapshot"), "the preview renders the same views from the saved draft");
assert(preview.includes("getCurrentAdmin()") && preview.includes("redirect(\"/admin/login\")"), "only a signed-in admin can open the preview");
assert(preview.includes("index: false"), "a preview is never indexed");
assert(read("src/app/robots.ts").includes("/pratonton"), "robots.txt keeps search engines out of /pratonton");

const view = read("src/components/reader/WorkView.tsx");
assert(view.includes("chapterHref") && !view.includes("/kategori/novela/${work.slug}/${section.slug}"), "chapter links go through one function so the preview keeps its own links");
assert(view.includes("{preview ? null : <script") && read("src/components/reader/EpisodeView.tsx").includes("{preview ? null : <script"), "a preview writes no structured data for search engines");

const old = read("src/app/admin/works/[id]/preview/page.tsx");
assert(old.includes("redirect(`/pratonton/${id}`)") && !old.includes("\"use client\""), "the old preview address redirects to the real preview");
assert(read("src/components/admin/WorkStatusPanel.tsx").includes("href={`/pratonton/${workId}`}") && read("src/app/admin/works/page.tsx").includes("href={`/pratonton/${work.id}`}"), "the Pratonton buttons open the real preview");
const editor = read("src/app/admin/works/[id]/page.tsx");
assert(editor.includes("\"Tutup pratonton teks\" : \"Pratonton teks\"") && !editor.includes("\"Pratonton bacaan\""), "the in-editor text view is called what it is: a text preview");

const revision = read("src/lib/admin/revision-service.ts");
assert(revision.includes("export async function buildLiveSnapshot") && revision.includes("JSON.parse(JSON.stringify(buildSnapshot(input)))"), "the draft snapshot goes through the same JSON round trip as a frozen revision (dates become text)");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
