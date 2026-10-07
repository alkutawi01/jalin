import fs from "node:fs";
import { OG_SITE, DEFAULT_SHARE_IMAGE } from "../../../lib/seo";
import path from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { getDb, hasDb } from "../../../lib/db";
import { disclosureToShow } from "../../../lib/reader/contributor-disclosure";
import { authorSlug } from "../../../lib/reader/author-alias";

const allowed = new Set(["nara-zahin", "rafiq-naim"]);


async function readContributor(slug: string) {
  if (process.env.CONTENT_SOURCE === "database" && hasDb()) {
    const row = await getDb().selectFrom("contributors")
      .select(["display_name", "bio", "disclosure", "kind"])
      .where("slug", "in", [slug, authorSlug(slug)])
      .where("is_visible", "=", true)
      .orderBy("slug", slug === authorSlug(slug) ? "asc" : "desc")
      .executeTakeFirst();
    if (row) {
      return {
        name: row.display_name,
        // A bio saved from the admin text box ends its lines with CRLF; without this its "# Name" title line is not removed and the name shows twice.
        body: (row.bio || "").replace(/\r\n/g, "\n").trim().replace(/^# .+\n+/, "").trim(),
        disclosure: row.disclosure,
        kind: row.kind,
      };
    }
    // Existing published revision snapshots may still link to the old slug.
    // Keep their historical static profile reachable until republished.
  }
  if (!allowed.has(slug)) return null;
  const filePath = path.join(process.cwd(), "content/contributors", slug + ".md");
  if (!fs.existsSync(filePath)) return null;
  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  return {
    name: String(parsed.data.name ?? ""),
    body: parsed.content.trim().replace(/^# .+\n+/, "").trim(),
    disclosure: null,
    kind: "virtual",
  };
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = await readContributor(slug);
  if (!parsed) return {};
  const name = parsed.name;
  // An older address names the editor's record as the page for this person (only where that record exists: the database).
  const address = `/penulis/${process.env.CONTENT_SOURCE === "database" && hasDb() ? authorSlug(slug) : slug}`;
  const description = parsed.kind === "virtual"
    ? `${name} — penyumbang maya Jalin di bawah kawal selia editorial manusia.`
    : `${name} — penyumbang Jalin.`;
  return {
    title: name,
    description,
    alternates: { canonical: address },
    openGraph: { ...OG_SITE, type: "profile", title: name, description, url: address, images: [DEFAULT_SHARE_IMAGE] },
    twitter: { card: "summary_large_image", title: name, description, images: [DEFAULT_SHARE_IMAGE.url] }
  };
}

export default async function PenulisPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const parsed = await readContributor(slug);
  if (!parsed) notFound();
  const disclosure = parsed.kind === "virtual" ? disclosureToShow(parsed.body, parsed.disclosure) : null;

  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1} className="contributor-page site-shell">
        <div className="contributor-kicker">Penyumbang Jalin</div>
        <h1>{parsed.name}</h1>
        <div className="contributor-copy">
          <ReactMarkdown>{parsed.body}</ReactMarkdown>
        </div>
        {disclosure ? <p className="contributor-disclosure">{disclosure}</p> : null}
      </main>
      <SiteFooter />
    </>
  );
}
