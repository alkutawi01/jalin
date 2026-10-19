/**
 * Admin editor guidance and credits, from the 16 Oct 2026 review of publishing "Jangan Didihkan Daun Itu":
 *  - the two status sentences no longer share words for two different things (saved vs published);
 *  - "Pembantu" is always offered as a credit role;
 *  - "Nama di bawah tajuk" starts ticked for the people who wrote the text, for a typed credit and for a pasted answer, and never
 *    overrides a tick the editor has set;
 *  - the Visual mode points to Markdown (message boxes, scene breaks, footnotes) and opens the guide.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUGGESTED_ROLES, STANDARD_ROLES, bylineByDefault } from "../src/lib/credit-roles";
import { planEditorAnswer, type EditorState } from "../src/lib/admin/authoring/editor-assistant";

let passed = 0;
let failed = 0;
function ok(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const src = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

// credit roles
ok(SUGGESTED_ROLES.includes("Pembantu"), "'Pembantu' is a suggested credit role");
ok(SUGGESTED_ROLES.every((role) => role.charAt(0) === role.charAt(0).toUpperCase() && !STANDARD_ROLES.some((s) => s.value === role)), "a suggested role is stored as its own capitalised text and does not shadow an internal key");
ok(bylineByDefault("initial_draft") === true, "Penulis starts with the name under the title");
ok(bylineByDefault("story_editor") === true, "Penulis & penyemak starts with the name under the title");
ok(bylineByDefault("co_writer") === true && bylineByDefault("Penulis bersama") === true, "older spellings of Penulis behave as Penulis");
ok(["final_editor", "author", "Pembantu", "Penyemak", "Idea asal", "Pemantau", "", null, undefined].every((role) => bylineByDefault(role as string) === false), "an editor, helper, checker or empty role starts unticked");

const select = src("src/components/admin/CreditRoleSelect.tsx");
ok(select.includes("SUGGESTED_ROLES") && select.includes("...listed"), "the role list shows the suggested roles");
ok(select.includes("!custom.includes(role)"), "a suggested role already added by an editor is not listed twice");

const page = src("src/app/admin/works/[id]/page.tsx");
ok(page.includes("bylineByDefault(role)"), "choosing a role sets the starting tick on a new credit");
ok(page.includes("prev?.id || bylineTouched.current"), "an existing credit and a tick the editor already set are never overridden");
ok(page.includes("bylineTouched.current = true") && page.includes("bylineTouched.current = false"), "the tick is remembered as chosen, and reset when a credit is opened");

// the credits table tells the editor which AI is behind a pseudonym (admin only; the reader still sees the pseudonym)
ok(page.includes('fetch("/api/admin/ai-personas")') && page.includes("const contributorLabel"), "the work page loads which AI writes under which pseudonym");
ok(page.includes("`${name} (${aiBySlug[slug]})`"), "an AI credit reads 'Rafiq Naim (ChatGPT)'");
ok((page.match(/contributorLabel\(credit\.contributor_slug\)/g) ?? []).length === 2, "the credits table cell and the byline toggle's label both use it");
ok(!src("src/lib/reader/credit-projection.ts").includes("ai-personas"), "the reader's credits do not read the AI mapping");

const service = src("src/lib/admin/authoring/editor-answer-service.ts");
ok(service.includes("flag(row.byline, bylineByDefault(role))"), "a pasted answer that omits the name-under-title line follows the same default");

// status sentences
const panel = src("src/components/admin/WorkStatusPanel.tsx");
ok(!panel.includes("Ada perubahan dalam draf yang belum diterbitkan"), "the old publish sentence is gone");
ok(panel.includes("Draf berbeza daripada versi terbit") && panel.includes("Terbitkan semula untuk menunjukkan perubahan teks, kredit, gambar atau glosari"), "the publish sentence says what to press and which changes it covers");
ok(!page.includes("Tiada perubahan tertunggak"), "the save bar no longer says 'perubahan' for 'nothing to save'");
ok(page.includes("Teks & maklumat: sudah disimpan") && page.includes("Pembaca hanya melihat apa-apa perubahan selepas karya diterbitkan"), "the save bar says it is saved and that readers see changes only after publishing");

// the editor's note is called "Catatan" everywhere (admin, reader, chatbot format); the old label is still read
ok(src("src/components/reader/StoryChrome.tsx").includes('<h2 id="editor-note-title">Catatan</h2>'), "the reader's heading is 'Catatan'");
ok(/<label id="editorNote-label"[\s\S]*?>Catatan<\/label>/.test(page) && page.includes("bawah tajuk &quot;Catatan&quot;"), "the admin field and its hint say 'Catatan'");
const assistant = src("src/lib/admin/authoring/editor-assistant.ts");
ok(assistant.includes("Catatan: (jika berkenaan)") && !assistant.includes("Catatan editor: (jika berkenaan)"), "the chatbot format asks for 'Catatan:'");
{
  const state = { work: { type: "cerpen", title: "T", body: "B", metadata: {}, reader: {} }, chapters: [], credits: [], glossary: [], source: null } as unknown as EditorState;
  const noteOf = (answer: string) => planEditorAnswer(answer, "metadata", state).find((c) => c.key === "editorNote")?.value;
  ok(noteOf("[MAKLUMAT]\nGenre: Fiksyen\nCatatan: Satu catatan.") === "Satu catatan.", "an answer with 'Catatan:' fills the note");
  ok(noteOf("[MAKLUMAT]\nGenre: Fiksyen\nCatatan editor: Jawapan lama.") === "Jawapan lama.", "an older answer with 'Catatan editor:' still fills the note");
}

// the note under the story is set smaller than the story at every size, so it does not read as more story
{
  const css = src("src/app/globals.css");
  const px = (re: RegExp) => Number(re.exec(css)?.[1]);
  const noteBase = px(/\.editor-note p \{[^}]*?font-size: ([\d.]+)px/);
  const noteLaptop = px(/@media \(min-width: 1051px\) and \(max-width: 1600px\) \{ \.editor-note p \{ font-size: ([\d.]+)px/);
  const notePhone = px(/@media \(max-width: 820px\) \{ \.editor-note p \{ font-size: ([\d.]+)px/);
  ok(noteBase < 21 && noteLaptop < 19 && notePhone < 17.5, `the note (${noteBase}px, ${noteLaptop}px laptop, ${notePhone}px phone) is smaller than the story (21px, 19px, 17.5px)`);
}

// Markdown pointer
ok(page.includes("data-markdown-pointer") && page.includes(":::mesej"), "the Visual mode names what only Markdown mode edits");
ok(/\.admin-form-hint\[data-markdown-pointer\] \{[^}]*display: flex;[^}]*margin: 8px 0 12px/.test(src("src/app/admin/admin.css")), "the pointer's button has its own line space instead of touching the toolbar below");
ok(page.includes("onClick={openWritingGuide}") && page.includes("ref={writingGuideRef}"), "the pointer opens Markdown mode and the folded guide");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
