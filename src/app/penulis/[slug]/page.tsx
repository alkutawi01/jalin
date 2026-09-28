import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import ReactMarkdown from "react-markdown";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";

const allowed = new Set(["nara-zahin", "rafiq-naim"]);

function readContributor(slug: string) {
  if (!allowed.has(slug)) return null;
  const filePath = path.join(process.cwd(), "content/contributors", slug + ".md");
  if (!fs.existsSync(filePath)) return null;
  return matter(fs.readFileSync(filePath, "utf8"));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = readContributor(slug);
  if (!parsed) return {};
  const name = String(parsed.data.name ?? "");
  const description = `${name} — penulis maya Jalin yang bekerja di bawah kawal selia editorial manusia.`;
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
  const parsed = readContributor(slug);
  if (!parsed) notFound();

  // Content body starts with an "# Name" heading that duplicates the page's
  // own <h1>; drop it so it renders as prose, not raw Markdown syntax.
  const body = parsed.content.trim().replace(/^# .+\n+/, "").trim();

  return (
    <>
      <SiteHeader />
      <main className="contributor-page site-shell">
        <div className="contributor-kicker">Penulis Maya Jalin</div>
        <h1>{String(parsed.data.name ?? "")}</h1>
        <div className="contributor-badge">Maya</div>
        <div className="contributor-copy">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
        <p className="contributor-disclosure">
          Persona ini ialah identiti editorial maya Jalin dan bekerja di bawah kawal selia editorial manusia.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
