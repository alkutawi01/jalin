import { notFound } from "next/navigation";
import {
  EditorialImage,
  LeftRail,
  RightRail,
  SiteFooter,
  SiteHeader,
  StoryEnd,
  StoryHead
} from "../../../../components/reader/StoryChrome";
import StoryMarkdown from "../../../../components/reader/StoryMarkdown";
import MobileStoryInfo from "../../../../components/reader/MobileStoryInfo";
import { initContentRepository } from "../../../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../../../lib/content/workLoader";
import { getContributorDisplay } from "../../../../lib/content/contributors";
import type {
  BylineCredit,
  CharacterMeta,
  EditorialCredit,
  GlossaryMap,
  StoryInfoData,
  WorkMetaRow
} from "../../../../components/reader/types";
import type { WorkType } from "../../../../lib/content/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const types: WorkType[] = ["cerpen", "novela", "terjemahan", "bersiri", "fragmen", "sinopsis"];
  const params: { type: string; slug: string }[] = [];

  const repo = await initContentRepository();
  const useRepo = repo.constructor.name === "DatabaseContentRepository";

  for (const type of types) {
    const works = useRepo ? repo.getWorksByType(type) : getWorksByType(type);
    for (const work of works) {
      params.push({ type, slug: work.slug });
    }
  }
  return params;
}

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  terjemahan: "Terjemahan",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

function splitBody(body: string, anchor: string, place: "before" | "after"): [string, string] {
  const index = body.indexOf(anchor);
  if (index < 0) return [body, ""];
  if (place === "before") {
    return [body.slice(0, index), body.slice(index)];
  }
  const end = index + anchor.length;
  return [body.slice(0, end), body.slice(end)];
}

async function getWork(slug: string) {
  const repo = await initContentRepository();
  if (repo.constructor.name === "DatabaseContentRepository") {
    return repo.getWork(slug);
  }
  return getWorkBySlug(slug);
}

export default async function WorkPage({
  params
}: {
  params: Promise<{ type: string; slug: string }>;
}) {
  const { type, slug } = await params;
  const work = await getWork(slug);
  if (!work || work.type !== type) {
    notFound();
  }

  const glossary: GlossaryMap = {};
  for (const entry of work.glossary) {
    glossary[entry.term] = { meaning: entry.meaning, source: entry.source };
  }

  const byline: BylineCredit[] = work.credits
    .filter((credit) => credit.byline)
    .map((credit) => {
      const display = getContributorDisplay(credit.slug);
      return {
        name: display.name,
        maya: display.kind === "virtual",
        href: `/penulis/${credit.slug}`
      };
    });

  const typeLabel = TYPE_LABELS[type] ?? type;

  const workMeta: WorkMetaRow[] = [
    { label: "Bentuk", value: typeLabel },
    { label: "Genre", value: work.genre ?? "Keluarga" },
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    {
      label: "Status",
      value: work.sourceWork
        ? work.sourceWork.rightsStatus
          ? `Sumber: ${work.sourceWork.rightsStatus}`
          : "Karya berasaskan sumber"
        : "Karya asli Jalin"
    },
    { label: "ID", value: work.id },
    { label: "Versi", value: work.version }
  ];

  const characters: CharacterMeta[] = work.metadata?.characters ?? [];

  const editorial: EditorialCredit[] = work.credits.map((credit) => {
    const display = getContributorDisplay(credit.slug);
    const label = credit.role === "initial_draft"
      ? "Penulis"
      : credit.role === "story_editor"
        ? "Penulis & penyemak"
        : credit.role === "final_editor"
          ? "Editor"
          : credit.role;
    return {
      role: label,
      name: display.kind === "virtual" ? `${display.name} · Maya` : display.name
    };
  });

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    editorial,
    note: work.reader?.note ?? "Penulis Maya bekerja di bawah kawal selia editorial manusia."
  };

  const rights = `${work.title.toUpperCase()} · © ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)} · ILUSTRASI JALIN`;

  const hero = work.visuals.find((visual) => visual.role === "hero");
  const inlineVisuals = work.visuals.filter((visual) => visual.anchor);

  let remaining = work.body;
  const segmentNodes: (string | { visual: (typeof work.visuals)[number] })[] = [];
  for (const visual of inlineVisuals) {
    const [before, after] = splitBody(remaining, visual.anchor ?? "", visual.place ?? "after");
    segmentNodes.push(before);
    segmentNodes.push({ visual });
    remaining = after;
  }
  segmentNodes.push(remaining);

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main>
        <StoryHead
          kicker={`${typeLabel} · ${work.genre ?? "Keluarga"}`}
          title={work.title}
          dek={work.dek ?? ""}
          byline={byline}
        />

        <div className="site-shell">
          <EditorialImage
            kind="hero"
            src={hero?.src ?? ""}
            alt={hero?.alt ?? ""}
            rights={rights}
          />
        </div>

        <div className="site-shell reading-grid">
          <LeftRail
            rows={workMeta}
            note="Penulis Maya bekerja di bawah kawal selia editorial manusia."
          />

          <article className="story-body">
            {segmentNodes.map((node, index) => {
              if (typeof node === "string") {
                return (
                  <StoryMarkdown key={index} glossary={glossary}>
                    {node}
                  </StoryMarkdown>
                );
              }
              if ("visual" in node) {
                return (
                  <EditorialImage
                    key={index}
                    src={node.visual.src}
                    alt={node.visual.alt}
                    rights={rights}
                  />
                );
              }
              return null;
            })}
          </article>

          <RightRail characters={characters} editorial={editorial} />
        </div>

        <StoryEnd title={work.title} />

        {work.sourceWork && (
          <section className="site-shell source-provenance" aria-label="Provenance sumber" style={{ maxWidth: "42rem", margin: "0 auto 3rem", padding: "0 1.25rem" }}>
            <h2 style={{ fontSize: "1rem", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              Sumber &amp; provenance
            </h2>
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "0.35rem 1rem", margin: 0, fontSize: "0.95rem" }}>
              {work.sourceWork.title && (
                <>
                  <dt style={{ opacity: 0.7 }}>Tajuk asal</dt>
                  <dd style={{ margin: 0 }}>{work.sourceWork.title}</dd>
                </>
              )}
              {work.sourceWork.author && (
                <>
                  <dt style={{ opacity: 0.7 }}>Penulis asal</dt>
                  <dd style={{ margin: 0 }}>{work.sourceWork.author}</dd>
                </>
              )}
              {work.sourceWork.language && (
                <>
                  <dt style={{ opacity: 0.7 }}>Bahasa asal</dt>
                  <dd style={{ margin: 0 }}>{work.sourceWork.language}</dd>
                </>
              )}
              {work.sourceWork.rightsStatus && (
                <>
                  <dt style={{ opacity: 0.7 }}>Hak penggunaan</dt>
                  <dd style={{ margin: 0 }}>{work.sourceWork.rightsStatus}</dd>
                </>
              )}
            </dl>
          </section>
        )}

        <MobileStoryInfo data={mobileInfo} />
      </main>

      <SiteFooter />
    </>
  );
}
