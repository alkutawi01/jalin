/**
 * Public reader credit projection tests.
 *
 * The reader may only display the original author/source and approved
 * Jalin editorial contributors — never raw role keys, internal enum
 * values or placeholder fallback names.
 */

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
  assert(editorial.length === 1, "Sinopsis credits project to exactly one public credit");
  assert(editorial[0]?.role === "Pengarang asal", "Sinopsis author credit label reads Pengarang asal");
  assert(editorial[0]?.name === "Naguib Mahfouz", "Sinopsis source author name preserved");
  assert(!json(editorial).includes("author"), "No raw 'author' enum reaches the reader");
  assert(projectBylineCredits(sinopsis?.credits ?? []).length === 0, "Sinopsis source author stays out of the byline");
}

{
  const gatsby = getWorkBySlug("gatsby-agung");
  const editorial = projectEditorialCredits(gatsby?.credits ?? []);
  assert(editorial.length === 1 && editorial[0]?.role === "Pengarang asal", "Second real derivative source author labelled Pengarang asal");
  assert(editorial[0]?.name === "F. Scott Fitzgerald", "Second real derivative source author name preserved");
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
  assert(projectEditorialCredits(dbLabel).length === 0, "Arbitrary DB role labels that are not approved stay hidden");
  const approvedLabel: ContributorRef[] = [{ slug: "izzat-anas", role: "Editor", byline: false }];
  assert(json(projectEditorialCredits(approvedLabel)) === json([{ role: "Editor", name: "Izzat Anas" }]), "Already-projected approved labels pass through");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
