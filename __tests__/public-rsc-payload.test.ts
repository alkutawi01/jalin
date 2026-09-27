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
import PenulisPage from "../src/app/penulis/[slug]/page";
import MobileStoryInfo from "../src/components/reader/MobileStoryInfo";

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
  "source"
]);

const FORBIDDEN_STRINGS = ["guest:", "final_editor", "initial_draft", "story_editor"];

/** Client components receive their data as props; do not execute them. */
const CLIENT_COMPONENTS = new Set<unknown>([MobileStoryInfo]);

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
  scanValue(props, "props", hits);

  const type = node.type;
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
    { type: "fragmen", slug: "gatsby-kapal-melawan-arus" },
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

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
