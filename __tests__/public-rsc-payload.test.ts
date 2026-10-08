/**
 * Public RSC/HTML payload regression tests (Phase 4F QA — P1).
 *
 * Next.js serializes component props into the public flight payload, so any
 * data passed as a prop on a public route reaches the browser inside the
 * HTML/RSC stream — regardless of whether it is visible on screen. These
 * tests render the public routes server-side and scan every rendered
 * element's serialized props for internal metadata that must never leave
 * the server:
 *
 *   - `credits` (raw contributor slugs, e.g. `guest:…`)
 *   - visuals provenance (`provider`, `creationId`)
 *   - `sourceWork`, `editorialHistory`, `publishedBy`
 *   - raw body/section/metadata objects (`body`, `sections`, `metadata`)
 *   - legacy glossary `source`
 *   - raw editorial role keys (`final_editor`, …)
 *   - hostile extra fields (`internalSecret`) on metadata.characters
 *   - internal identifiers (`work.id`) on the Bersiri episode route
 *
 * The scan mirrors the flight serialization boundary: it walks the props of
 * every element on the page, including elements produced inside child
 * components.
 */

import React from "react";
import type { ReactElement, ReactNode } from "react";
import Home from "../src/app/page";
import CategoryPage from "../src/app/kategori/[type]/page";
import WorkPage from "../src/app/kategori/[type]/[slug]/page";
import EpisodePage from "../src/app/kategori/bersiri/[seriesSlug]/[episodeSlug]/page";
import PenulisPage from "../src/app/penulis/[slug]/page";
import MobileStoryInfo from "../src/components/reader/MobileStoryInfo";
import MobileNavMenu from "../src/components/reader/MobileNavMenu";
import GlossaryTerm from "../src/components/reader/GlossaryTerm";
import ReadingProgress from "../src/components/reader/ReadingProgress";
import FootnoteMargin from "../src/components/reader/FootnoteMargin";
import HeaderSearch from "../src/components/reader/HeaderSearch";
import CountUp from "../src/components/reader/CountUp";
import StoryCollection from "../src/components/reader/StoryCollection";
import { initContentRepository } from "../src/lib/content";

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ok: ${description}`);
    passed++;
  } else {
    console.log(`  FAIL: ${description}`);
    failed++;
  }
}

const FORBIDDEN_KEYS = new Set([
  "credits",
  "provider",
  "creationId",
  "sourceWork",
  "editorialHistory",
  "publishedBy",
  "publishedRevision",
  "publishedRevisionId",
  "revisionCount",
  "versionLabel",
  "firstPublishedAt",
  "body",
  "metadata",
  "reader",
  "sections",
  "source",
  "internalSecret"
]);

const FORBIDDEN_STRINGS = [
  "guest:",
  "final_editor",
  "initial_draft",
  "story_editor",
  "SHOULD_NOT_BE_SERIALIZED"
];

/** Client components receive their data as props; do not execute them. */
const CLIENT_COMPONENTS = new Set<unknown>([MobileStoryInfo, MobileNavMenu, GlossaryTerm, ReadingProgress, FootnoteMargin, HeaderSearch, CountUp, StoryCollection]);

function scanValue(value: unknown, path: string, hits: string[]) {
  if (typeof value === "string") {
    for (const needle of FORBIDDEN_STRINGS) {
      if (value.includes(needle)) hits.push(`${path} (string contains "${needle}")`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => scanValue(item, `${path}[${index}]`, hits));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) hits.push(`${path}.${key}`);
      scanValue(child, `${path}.${key}`, hits);
    }
  }
}

async function walk(node: unknown, hits: string[]): Promise<void> {
  if (
    node === null ||
    node === undefined ||
    typeof node === "string" ||
    typeof node === "number" ||
    typeof node === "boolean"
  ) {
    return;
  }
  if (Array.isArray(node)) {
    for (const child of node) await walk(child, hits);
    return;
  }
  if (!React.isValidElement(node)) return;

  const props = node.props as Record<string, unknown>;
  const type = node.type;
  // Only what is serialized into the page is scanned: host elements and client components. A server component (a function
  // that is run here) receives its props on the server and they never cross into the payload; what it renders is walked next.
  // (WorkView and EpisodeView take the whole Work as a prop for exactly that reason, and the editor's preview shares them.)
  if (typeof type !== "function" || CLIENT_COMPONENTS.has(type)) scanValue(props, "props", hits);

  if (typeof type === "function" && !CLIENT_COMPONENTS.has(type)) {
    const output = await (type as (p: Record<string, unknown>) => ReactNode | Promise<ReactNode>)(props);
    await walk(output, hits);
  } else {
    await walk(props.children, hits);
  }
}

async function scanPage(name: string, page: ReactElement | Promise<ReactElement>) {
  const rendered = await page;
  const hits: string[] = [];
  await walk(rendered, hits);
  assert(hits.length === 0, `${name} props clean${hits.length > 0 ? ` — leaks: ${[...new Set(hits)].join(", ")}` : ""}`);
}

/**
 * Inject in-memory fixture works through the content repository singleton so
 * the public projection boundary can be proven against hostile data:
 *
 *   - a cerpen whose metadata.characters carries an extra field
 *     (`internalSecret: "SHOULD_NOT_BE_SERIALIZED"`) — must be stripped by the
 *     server-side runtime projection before props reach the client;
 *   - a Bersiri episode whose `work.id` carries a sentinel value — the ID
 *     metadata row must not be serialized into the public payload.
 *
 * Only the test process's repository instance is patched; content files,
 * database, schema and production data are untouched.
 */
async function installProjectionFixtures() {
  const repo = await initContentRepository();
  const realGetWork = repo.getWork.bind(repo);

  const baseWork = realGetWork("kerusi-di-beranda");
  if (!baseWork) throw new Error("fixture base work missing");

  const secretWork = {
    ...baseWork,
    slug: "karya-ujian-rahsia",
    title: "Karya Ujian Rahsia",
    metadata: {
      characters: [
        { name: "Amin", role: "tokoh utama", internalSecret: "SHOULD_NOT_BE_SERIALIZED" }
      ]
    }
  };

  const episodeWork = {
    ...baseWork,
    id: "WORK_ID_SHOULD_NOT_BE_SERIALIZED",
    slug: "episod-ujian-qa",
    title: "Episod Ujian QA",
    type: "bersiri" as const,
    series: {
      id: "SER-UJI-QA",
      slug: "siri-ujian-qa",
      title: "Siri Ujian QA",
      mode: "continuous" as const,
      status: "ongoing" as const
    },
    metadata: {
      characters: [{ name: "Amin", role: "tokoh utama" }]
    }
  };

  Object.defineProperty(repo, "source", {
    value: "database",
    configurable: true
  });
  Object.defineProperty(repo, "getWork", {
    value: (slug: string) => (slug === secretWork.slug ? secretWork : realGetWork(slug)),
    configurable: true,
    writable: true
  });
  Object.defineProperty(repo, "getEpisodeBySeriesAndSlug", {
    value: (seriesSlug: string, episodeSlug: string) =>
      seriesSlug === episodeWork.series.slug && episodeSlug === episodeWork.slug
        ? episodeWork
        : undefined,
    configurable: true,
    writable: true
  });
  Object.defineProperty(repo, "getPublishedSeriesEpisodes", {
    value: (seriesId: string) =>
      seriesId === episodeWork.series.id
        ? [{ position: 1, slug: episodeWork.slug, title: episodeWork.title }]
        : [],
    configurable: true,
    writable: true
  });

  return { secretWork, episodeWork, episodeSeriesSlug: episodeWork.series.slug };
}

async function main() {
  await scanPage("homepage (/)", Home());

  for (const type of ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"]) {
    await scanPage(
      `category /kategori/${type}`,
      CategoryPage({ params: Promise.resolve({ type }) })
    );
  }

  const works: { type: string; slug: string }[] = [
    { type: "cerpen", slug: "kerusi-di-beranda" },
    { type: "cerpen", slug: "nombor-giliran-117" },
    { type: "sinopsis", slug: "gatsby-agung" },
    { type: "sinopsis", slug: "di-hadapan-singgahsana" }
  ];
  for (const { type, slug } of works) {
    await scanPage(
      `reader /kategori/${type}/${slug}`,
      WorkPage({ params: Promise.resolve({ type, slug }) })
    );
  }

  await scanPage(
    "author /penulis/rafiq-naim",
    PenulisPage({ params: Promise.resolve({ slug: "rafiq-naim" }) })
  );
  await scanPage(
    "author /penulis/nara-zahin",
    PenulisPage({ params: Promise.resolve({ slug: "nara-zahin" }) })
  );

  // Fixture renders: inject fake works through the content repository singleton
  // so serialization of internal fields can be proven directly. No content,
  // schema or production data is touched — only in-memory test fixtures.
  const fixtures = await installProjectionFixtures();

  await scanPage(
    `reader projection fixture /kategori/cerpen/${fixtures.secretWork.slug} (extra character fields must not serialize)`,
    WorkPage({ params: Promise.resolve({ type: "cerpen", slug: fixtures.secretWork.slug }) })
  );

  await scanPage(
    `bersiri episode /kategori/bersiri/${fixtures.episodeSeriesSlug}/${fixtures.episodeWork.slug} (work.id must not serialize)`,
    EpisodePage({
      params: Promise.resolve({
        seriesSlug: fixtures.episodeSeriesSlug,
        episodeSlug: fixtures.episodeWork.slug
      })
    })
  );

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
