import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";

const allowed = new Set(["nara-zahin", "rafiq-naim"]);

export default async function PenulisPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!allowed.has(slug)) notFound();

  const filePath = path.join(process.cwd(), "content/contributors", slug + ".md");
  if (!fs.existsSync(filePath)) notFound();

  const parsed = matter(fs.readFileSync(filePath, "utf8"));
  const paragraphs = parsed.content
    .replace(/^# .+\n+/, "")
    .trim()
    .split(/\n\n+/);

  return (
    <>
      <SiteHeader />
      <main className="contributor-page site-shell">
        <div className="contributor-kicker">Penulis Maya Jalin</div>
        <h1>{String(parsed.data.name ?? "")}</h1>
        <div className="contributor-badge">Maya</div>
        <div className="contributor-copy">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph.replace(/^[-*]\s+/gm, "")}</p>
          ))}
        </div>
        <p className="contributor-disclosure">
          Persona ini ialah identiti editorial maya Jalin dan bekerja di bawah kawal selia editorial manusia.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
