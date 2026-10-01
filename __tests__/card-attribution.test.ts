import assert from "node:assert/strict";
import { getWorkBySlug } from "../src/lib/content/workLoader";
import { projectPublicWorkSummary } from "../src/lib/reader/public-projection";
import { projectCardAttribution } from "../src/lib/reader/card-attribution";
import { selectPublishedEditorPicks } from "../src/lib/reader/editor-picks";
import type { Work } from "../src/lib/content/types";

function work(slug: string): Work {
  const value = getWorkBySlug(slug);
  assert.ok(value, `Missing fixture: ${slug}`);
  return value;
}

const cerpen = projectPublicWorkSummary(work("kerusi-di-beranda"));
assert.match(cerpen.attribution?.primary ?? "", /^Oleh Nara Zahin · Maya$/);
assert.ok(!cerpen.attribution?.primary.includes("Rafiq"), "story editor is not relabelled as author");

const sinopsis = projectPublicWorkSummary(work("di-hadapan-singgahsana"));
assert.match(sinopsis.attribution?.primary ?? "", /^Sinopsis oleh Nara Zahin · Maya$/);
assert.match(sinopsis.attribution?.secondary ?? "", /Berdasarkan Amam al-'Arsh karya Naguib Mahfouz/);
assert.ok(!sinopsis.attribution?.primary.includes("Naguib"), "source author is not called synopsis author");

const fragmen = projectPublicWorkSummary(work("gatsby-kapal-melawan-arus"));
assert.equal(fragmen.attribution?.primary, "Petikan daripada The Great Gatsby · F. Scott Fitzgerald");

const withoutCredit: Work = { ...work("kerusi-di-beranda"), credits: [], sourceWork: undefined };
assert.equal(projectCardAttribution(withoutCredit), undefined, "do not invent a writer when credit is missing");

const published = work("kerusi-di-beranda");
const selected = selectPublishedEditorPicks([published.id, "missing-id"], [published]);
assert.equal(selected.length, 1);
assert.equal(selected[0]?.title, published.title, "editor pick shows published snapshot content");
assert.equal(selected[0]?.attribution?.primary, cerpen.attribution?.primary);

console.log("card attribution tests passed");
