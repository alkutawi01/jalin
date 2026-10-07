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
import { projectPublicSeries } from "../src/lib/reader/public-projection";
import { getWorkBySlug } from "../src/lib/content/workLoader";
import type { ContributorRef, SeriesMeta } from "../src/lib/content/types";

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
  const renamed: ContributorRef = {
    slug: "claude", role: "initial_draft", byline: true,
    displayName: "Nama Pilihan Editor", kind: "virtual",
  };
  assert(json(projectBylineCredits([renamed])) === json([
    { name: "Nama Pilihan Editor", href: "/penulis/claude", maya: true },
  ]), "Contributor renamed in admin retains a public byline and profile link");
}

{
  const kerusi = getWorkBySlug("kerusi-di-beranda");
  const editorial = projectEditorialCredits(kerusi?.credits ?? []);
  assert(json(editorial) === json([
    { role: "Penulis", names: ["Nara Zahin"] },
    { role: "Penulis & penyemak", names: ["Rafiq Naim"] },
    { role: "Penyunting", names: ["Izzat Anas"] }
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
  assert(original[0]?.names[0] === "Naguib Mahfouz", "Sinopsis source author name preserved");
  assert(
    editorial.some((credit) => credit.role === "Penulis") && editorial.some((credit) => credit.role === "Penyunting"),
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
  assert(original[0]?.names[0] === "F. Scott Fitzgerald", "Second real derivative source author name preserved");
  assert(!json(projectBylineCredits(gatsby?.credits ?? [])).includes("Fitzgerald"), "Second derivative's source author stays out of the byline");
}

{
  assert(!getWorkBySlug("gatsby-kapal-melawan-arus"), "Archived English fragment is absent from public works");
  const byline = projectBylineCredits([{ slug: "guest:F. Scott Fitzgerald", role: "author", byline: true }]);
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
    { role: "Penulis bersama", names: ["Rafiq Naim", "Amir Syafiq"] },
    { role: "Penyunting", names: ["Izzat Anas"] }
  ]), "co_writer maps to a Malay label, written once with both co-writers listed under it");
}

{
  const unknownRole: ContributorRef[] = [{ slug: "izzat-anas", role: "internal_only_key", byline: false }];
  assert(projectEditorialCredits(unknownRole).length === 0, "Unrecognised internal role keys are hidden");
}

{
  const custom: ContributorRef[] = [{ slug: "izzat-anas", role: "Penterjemah", byline: false }];
  assert(json(projectEditorialCredits(custom)) === json([{ role: "Penterjemah", names: ["Izzat Anas"] }]), "A role added by an editor is shown as written");
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
  assert(json(projectEditorialCredits(approvedLabel)) === json([{ role: "Penyunting", names: ["Izzat Anas"] }]), "Already-projected approved labels pass through");
}

// One person with several roles: shown once, roles joined by commas
{
  const rafiq = { displayName: "Rafiq Naim", kind: "virtual" as const };
  const credits: ContributorRef[] = [
    { slug: "rafiq-naim", role: "Penulis bersama", byline: false, ...rafiq },
    { slug: "izzat-anas", role: "Editor", byline: false, displayName: "Izzat Anas", kind: "human" },
    { slug: "rafiq-naim", role: "Penterjemah", byline: false, ...rafiq },
    { slug: "rafiq-naim", role: "Penulis bersama", byline: false, ...rafiq }
  ];
  assert(json(projectEditorialCredits(credits)) === json([
    { role: "Penulis, Penterjemah", names: ["Rafiq Naim"] },
    { role: "Penyunting", names: ["Izzat Anas"] }
  ]), "The same person with two roles appears once, roles separated by a comma, in order, without repeating a role; a lone writer is \"Penulis\", not \"Penulis bersama\"");
  assert(projectEditorialCredits(credits.slice(0, 2)).length === 2, "Different people stay on their own lines");
}

// "Penulis bersama" is not a role anyone picks: it appears by itself when two or more people are "Penulis"
{
  const maya = (slug: string, displayName: string, role: string): ContributorRef => ({ slug, role, byline: false, displayName, kind: "virtual" });
  assert(json(projectEditorialCredits([maya("mimo", "Mimo", "initial_draft")])) === json([
    { role: "Penulis", names: ["Mimo"] }
  ]), "one writer is plain \"Penulis\"");
  assert(json(projectEditorialCredits([maya("mimo", "Mimo", "initial_draft"), maya("rafiq-naim", "Rafiq Naim", "initial_draft")])) === json([
    { role: "Penulis bersama", names: ["Mimo", "Rafiq Naim"] }
  ]), "two \"Penulis\" credits are shown as \"Penulis bersama\" without anyone choosing it");
  assert(json(projectEditorialCredits([maya("mimo", "Mimo", "co_writer")])) === json([
    { role: "Penulis", names: ["Mimo"] }
  ]), "a legacy co_writer credit that stands alone reads \"Penulis\"");
  assert(json(projectEditorialCredits([maya("mimo", "Mimo", "initial_draft"), maya("rafiq-naim", "Rafiq Naim", "co_writer")])) === json([
    { role: "Penulis bersama", names: ["Mimo", "Rafiq Naim"] }
  ]), "legacy co_writer and Penulis count together");
}

// The case Izzat pointed at: three co-writers under one "Penulis bersama", not three labels
{
  const maya = (slug: string, displayName: string, role: string): ContributorRef => ({ slug, role, byline: false, displayName, kind: "virtual" });
  const credits: ContributorRef[] = [
    { slug: "izzat-anas", role: "Pengarah", byline: false, displayName: "Izzat Anas", kind: "human" },
    maya("mimo", "Mimo", "Penulis bersama"),
    maya("nara-zahin", "Nara Zahin", "Penulis bersama"),
    maya("rafiq-naim", "Rafiq Naim", "Penulis bersama")
  ];
  assert(json(projectEditorialCredits(credits)) === json([
    { role: "Pengarah", names: ["Izzat Anas"] },
    { role: "Penulis bersama", names: ["Mimo", "Nara Zahin", "Rafiq Naim"] }
  ]), "three co-writers share one 'Penulis bersama' label with the names listed under it");
  const withExtra = [...credits, maya("rafiq-naim", "Rafiq Naim", "Penterjemah")];
  assert(json(projectEditorialCredits(withExtra)) === json([
    { role: "Pengarah", names: ["Izzat Anas"] },
    { role: "Penulis bersama", names: ["Mimo", "Nara Zahin"] },
    { role: "Penulis bersama, Penterjemah", names: ["Rafiq Naim"] }
  ]), "a person with two roles keeps both roles together on one line, apart from those who hold only one");
}

{
  const series: SeriesMeta = {
    id: "SER-TEST", slug: "siri-uji", title: "Siri Uji", mode: "continuous", status: "ongoing",
    hero: { src: "/assets/siri-uji.png", alt: "Dua watak di hadapan rumah" },
  };
  assert(json(projectPublicSeries(series).hero) === json(series.hero), "Series artwork reaches public listing cards");
  assert(projectPublicSeries({ ...series, hero: undefined }).hero === undefined, "Legacy series without artwork remains renderable");
}

// "Editor" is "Penyunting" (PRPM: the dictionary itself gives penyunting as the Malay word). A credit saved earlier with the text "Editor" reads the new way too.
{
  const old: ContributorRef[] = [{ slug: "izzat-anas", role: "Editor", byline: false }, { slug: "izzat-anas", role: "Editor penerbitan", byline: false }];
  assert(json(projectEditorialCredits(old)) === json([{ role: "Penyunting, Penyunting penerbitan", names: ["Izzat Anas"] }]), "credits saved as \"Editor\" or \"Editor penerbitan\" read as Penyunting");
  const keyed: ContributorRef[] = [{ slug: "izzat-anas", role: "final_editor", byline: false }, { slug: "izzat-anas", role: "publication_editor", byline: false }];
  assert(json(projectEditorialCredits(keyed)) === json([{ role: "Penyunting, Penyunting penerbitan", names: ["Izzat Anas"] }]), "and so do the keys");
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
