/**
 * Public reader credit projection tests.
 *
 * The reader may only display the original author/source and approved
 * Jalin editorial contributors — never raw role keys, internal enum
 * values or placeholder fallback names.
 */

import fs from "node:fs";
import path from "node:path";
import { projectBylineCredits, projectEditorialCredits } from "../src/lib/reader/credit-projection";
import { getWorkBySlug } from "../src/lib/content/workLoader";
import type { ContributorRef } from "../src/lib/content/types";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

function json(list: unknown): string {
  return JSON.stringify(list);
}

console.log("reader credit projection tests\n");

{
  const kerusi = getWorkBySlug("kerusi-di-beranda");
  const editorial = projectEditorialCredits(kerusi?.credits ?? []);
  assert(json(editorial) === json([
    { role: "Penulis", name: "Nara Zahin · Maya" },
    { role: "Penulis & penyemak", name: "Rafiq Naim · Maya" },
    { role: "Editor", name: "Izzat Anas" }
  ]), "Existing cerpen editorial credit display is unchanged");

  const byline = projectBylineCredits(kerusi?.credits ?? []);
  assert(json(byline) === json([
    { name: "Nara Zahin", href: "/penulis/nara-zahin", maya: true },
    { name: "Rafiq Naim", href: "/penulis/rafiq-naim", maya: true }
  ]), "Existing cerpen byline display is unchanged");
}

{
  const sinopsis = getWorkBySlug("di-hadapan-singgahsana");
  const editorial = projectEditorialCredits(sinopsis?.credits ?? []);
  // The original author is distinct from the people who wrote the Jalin sinopsis.
  const original = editorial.filter((credit) => credit.role === "Pengarang asal");
  assert(original.length === 1, "Sinopsis has exactly one 'Pengarang asal' credit");
  assert(original[0]?.name === "Naguib Mahfouz", "Sinopsis source author name preserved");
  assert(
    editorial.some((credit) => credit.role === "Penulis") && editorial.some((credit) => credit.role === "Editor"),
    "Sinopsis also credits the Jalin writers/editor under their own labels"
  );
  assert(!json(editorial).includes("author"), "No raw 'author' enum reaches the reader");
  const byline = projectBylineCredits(sinopsis?.credits ?? []);
  assert(byline.length === 2 && byline.every((credit) => credit.maya), "Sinopsis byline is the Jalin writers (Maya)");
  assert(!json(byline).includes("Naguib Mahfouz"), "Sinopsis source author stays out of the byline");
}

{
  const gatsby = getWorkBySlug("gatsby-agung");
  const editorial = projectEditorialCredits(gatsby?.credits ?? []);
  const original = editorial.filter((credit) => credit.role === "Pengarang asal");
  assert(original.length === 1, "Second real derivative source author labelled Pengarang asal");
  assert(original[0]?.name === "F. Scott Fitzgerald", "Second real derivative source author name preserved");
  assert(!json(projectBylineCredits(gatsby?.credits ?? [])).includes("Fitzgerald"), "Second derivative's source author stays out of the byline");
}

{
  const fragmen = getWorkBySlug("gatsby-kapal-melawan-arus");
  const byline = projectBylineCredits(fragmen?.credits ?? []);
  assert(byline.length === 1, "Fragmen source author reaches the byline");
  assert(byline[0]?.name === "F. Scott Fitzgerald", "Fragmen byline shows the source author name");
  assert(byline[0]?.href === undefined, "Guest source author byline carries no contributor link");
  assert(byline[0]?.maya === false, "Guest source author is never marked Maya");

  const chromeSource = fs.readFileSync(
    path.join(process.cwd(), "src/components/reader/StoryChrome.tsx"),
    "utf8"
  );
  assert(!chromeSource.includes('href ?? "#"'), "Byline never falls back to a hash link");
  assert(chromeSource.includes("credit.href ? ("), "Byline renders a link only when the contributor has a Jalin profile");
}

{
  const coWriter: ContributorRef[] = [
    { slug: "chatgpt", role: "co_writer", byline: true },
    { slug: "mimo", role: "co_writer", byline: true },
    { slug: "izzat-anas", role: "final_editor", byline: false }
  ];
  const editorial = projectEditorialCredits(coWriter);
  assert(json(editorial) === json([
    { role: "Penulis bersama", name: "Rafiq Naim · Maya" },
    { role: "Penulis bersama", name: "Amir Syafiq · Maya" },
    { role: "Editor", name: "Izzat Anas" }
  ]), "co_writer maps to a Malay label instead of the raw role key");
}

{
  const unknownRole: ContributorRef[] = [{ slug: "izzat-anas", role: "fact_checker", byline: false }];
  assert(projectEditorialCredits(unknownRole).length === 0, "Unrecognised internal role keys are hidden");
}

{
  const custom: ContributorRef[] = [{ slug: "izzat-anas", role: "Penterjemah", byline: false }];
  assert(json(projectEditorialCredits(custom)) === json([{ role: "Penterjemah", name: "Izzat Anas" }]), "A role added by an editor is shown as written");
}

{
  const fallback: ContributorRef[] = [{ slug: "kontributor-tiada", role: "final_editor", byline: false }];
  const editorial = projectEditorialCredits(fallback);
  assert(editorial.length === 0, "Unapproved contributor is hidden instead of showing a fallback name");
  assert(!json(editorial).includes("Penyumbang Jalin"), "Placeholder fallback name never reaches the reader");
}

{
  const emptyGuest: ContributorRef[] = [{ slug: "guest:", role: "author", byline: false }];
  assert(projectEditorialCredits(emptyGuest).length === 0, "Empty guest identity is hidden");
  const emptySlug: ContributorRef[] = [{ slug: "", role: "initial_draft", byline: true }];
  assert(projectEditorialCredits(emptySlug).length === 0, "Empty credit slug is hidden");
  assert(projectBylineCredits(emptySlug).length === 0, "Empty credit slug never reaches the byline");
}

{
  const dbLabel: ContributorRef[] = [{ slug: "izzat-anas", role: "Penyunting akhir", byline: false }];
  assert(projectEditorialCredits(dbLabel).length === 1, "A role label chosen or added in admin (capitalised text) is shown; lowercase internal keys stay hidden");
  const approvedLabel: ContributorRef[] = [{ slug: "izzat-anas", role: "Editor", byline: false }];
  assert(json(projectEditorialCredits(approvedLabel)) === json([{ role: "Editor", name: "Izzat Anas" }]), "Already-projected approved labels pass through");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
