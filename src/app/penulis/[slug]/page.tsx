import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { getDb, hasDb } from "../../../lib/db";

const allowed = new Set(["nara-zahin", "rafiq-naim"]);

async function readContributor(slug: string) {
  if (process.env.CONTENT_SOURCE === "database" && hasDb()) {
    const row = await getDb().selectFrom("contributors")
      .select(["display_name", "bio", "disclosure", "kind"])
      .where("slug", "=", slug)
      .where("is_visible", "=", true)
      .executeTakeFirst();
    if (row) {
      return {
        name: row.display_name,
        body: (row.bio || "").trim().replace(/^# .+\n+/, "").trim(),
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
  const description = parsed.kind === "virtual"
    ? `${name} — penyumbang maya Jalin di bawah kawal selia editorial manusia.`
    : `${name} — penyumbang Jalin.`;
  return {
    title: name,
    description,
    alternates: { canonical: `/penulis/${slug}` },
    openGraph: { title: name, description, url: `/penulis/${slug}` }
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

  return (
    <>
      <SiteHeader />
      <main className="contributor-page site-shell">
        <div className="contributor-kicker">Penyumbang Jalin</div>
        <h1>{parsed.name}</h1>
        {parsed.kind === "virtual" && <div className="contributor-badge">Maya</div>}
        <div className="contributor-copy">
          <ReactMarkdown>{parsed.body}</ReactMarkdown>
        </div>
        {parsed.kind === "virtual" && <p className="contributor-disclosure">
          {parsed.disclosure || "Persona ini ialah identiti editorial maya Jalin dan bekerja di bawah kawal selia editorial manusia."}
        </p>}
      </main>
      <SiteFooter />
    </>
  );
}
