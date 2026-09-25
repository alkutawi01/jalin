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
import type { ReadingSection, WorkType } from "../../../../lib/content/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const types: WorkType[] = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
  const params: { type: string; slug: string; sectionSlug?: string }[] = [];

  const repo = await initContentRepository();
  const useRepo = repo.constructor.name === "DatabaseContentRepository";

  for (const type of types) {
    if (type === "bersiri") continue; // nested/series routes own bersiri URLs
    const works = useRepo ? repo.getWorksByType(type) : getWorksByType(type);
    for (const work of works) {
      if (type === "novela" && work.sections && work.sections.length > 0) {
        for (const section of work.sections) {
          params.push({ type, slug: work.slug, sectionSlug: section.slug });
        }
      }
      params.push({ type, slug: work.slug });
    }
  }
  return params;
}

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
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

function buildGlossary(work: Awaited<ReturnType<typeof getWork>>): GlossaryMap {
  const glossary: GlossaryMap = {};
  for (const entry of work?.glossary ?? []) {
    glossary[entry.term] = { meaning: entry.meaning, source: entry.source };
  }
  return glossary;
}

function resolvePublicContributor(slug: string) {
  if (slug.startsWith("guest:")) return { name: slug.slice(6), kind: "human" as const, href: undefined };
  const display = getContributorDisplay(slug);
  return { ...display, href: display.name === "Penyumbang Jalin" ? undefined : `/penulis/${slug}` };
}

function buildByline(work: Awaited<ReturnType<typeof getWork>>): BylineCredit[] {
  return (work?.credits ?? [])
    .filter((credit) => credit.byline)
    .map((credit) => {
      const display = resolvePublicContributor(credit.slug);
      return {
        name: display.name,
        maya: display.kind === "virtual",
        href: display.href
      };
    });
}

function buildMetaRows(work: Awaited<ReturnType<typeof getWork>>): WorkMetaRow[] {
  if (!work) return [];
  return [
    { label: "Bentuk", value: TYPE_LABELS[work.type] ?? work.type },
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
    { label: "Versi", value: work.version }
  ];
}

function buildEditorial(work: Awaited<ReturnType<typeof getWork>>): EditorialCredit[] {
  return (work?.credits ?? []).map((credit) => {
    const display = resolvePublicContributor(credit.slug);
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
}

function SectionNav({
  workSlug,
  sections,
  activeSlug
}: {
  workSlug: string;
  sections: ReadingSection[];
  activeSlug?: string;
}) {
  const currentIndex = activeSlug
    ? sections.findIndex((s) => s.slug === activeSlug)
    : 0;
  const current = sections[currentIndex];
  const prev = currentIndex > 0 ? sections[currentIndex - 1] : undefined;
  const next = currentIndex < sections.length - 1 ? sections[currentIndex + 1] : undefined;

  if (!current) return null;

  return (
    <nav className="site-shell section-nav" aria-label="Navigasi bahagian" style={{
      maxWidth: "42rem",
      margin: "0 auto 1.5rem",
      padding: "0 1.25rem",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.75rem",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.9rem"
    }}>
      <span style={{ opacity: 0.75 }}>
        Bahagian {currentIndex + 1} / {sections.length}
        {current.title ? ` · ${current.title}` : ""}
      </span>
      <span style={{ display: "flex", gap: "0.75rem" }}>
        {prev ? (
          <a href={`/kategori/novela/${workSlug}/${prev.slug}`} rel="prev">
            ← Sebelumnya
          </a>
        ) : (
          <span style={{ opacity: 0.4 }} aria-disabled="true">← Sebelumnya</span>
        )}
        <a href={`/kategori/novela/${workSlug}`} aria-label="Indeks bahagian">
          Indeks
        </a>
        {next ? (
          <a href={`/kategori/novela/${workSlug}/${next.slug}`} rel="next">
            Seterusnya →
          </a>
        ) : (
          <span style={{ opacity: 0.4 }} aria-disabled="true">Seterusnya →</span>
        )}
      </span>
    </nav>
  );
}

function SectionIndex({
  workSlug,
  sections
}: {
  workSlug: string;
  sections: ReadingSection[];
}) {
  if (sections.length === 0) return null;
  return (
    <nav className="site-shell section-index" aria-label="Indeks bahagian" style={{
      maxWidth: "42rem",
      margin: "0 auto 1.5rem",
      padding: "0 1.25rem"
    }}>
      <p style={{ fontSize: "0.8rem", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.7, marginBottom: "0.5rem" }}>
        Bahagian ({sections.length})
      </p>
      <ol style={{ margin: 0, paddingLeft: "1.25rem" }}>
        {sections.map((section) => (
          <li key={section.slug} style={{ marginBottom: "0.25rem" }}>
            <a href={`/kategori/novela/${workSlug}/${section.slug}`}>
              {section.title || section.slug}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export default async function WorkPage({
  params
}: {
  params: Promise<{ type: string; slug: string; sectionSlug?: string }>;
}) {
  const { type, slug, sectionSlug } = await params;

  // Bersiri nested episodes live at /kategori/bersiri/[seriesSlug]/[episodeSlug].
  // Flat /kategori/bersiri/[slug] is handled by the static series route (redirect).
  if (type === "bersiri") {
    notFound();
  }

  const work = await getWork(slug);
  if (!work || work.type !== type) {
    notFound();
  }

  const glossary = buildGlossary(work);
  const byline = buildByline(work);
  const typeLabel = TYPE_LABELS[type] ?? type;
  const workMeta = buildMetaRows(work);
  const characters: CharacterMeta[] = work.metadata?.characters ?? [];
  const editorial = buildEditorial(work);

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    editorial,
    note: work.reader?.note ?? "Penulis Maya bekerja di bawah kawal selia editorial manusia."
  };

  const rights = `${work.title.toUpperCase()} · © ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)} · ILUSTRASI JALIN`;
  const hero = work.visuals.find((visual) => visual.role === "hero");
  const inlineVisuals = work.visuals.filter((visual) => visual.anchor);

  const sections = work.sections && work.sections.length > 0 ? work.sections : [];
  let activeSection: ReadingSection | undefined;
  let bodyToRender = work.body;

  if (sections.length > 0) {
    if (sectionSlug) {
      activeSection = sections.find((s) => s.slug === sectionSlug);
      if (!activeSection) notFound();
      bodyToRender = activeSection.body;
    } else {
      activeSection = sections[0];
      bodyToRender = activeSection.body;
    }
  }

  const segmentNodes: (string | { visual: (typeof work.visuals)[number] })[] = [];
  let remaining = bodyToRender;
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

        {sections.length > 0 && !sectionSlug && (
          <SectionIndex workSlug={work.slug} sections={sections} />
        )}

        {sections.length > 0 && (
          <SectionNav
            workSlug={work.slug}
            sections={sections}
            activeSlug={activeSection?.slug}
          />
        )}

        <div className="site-shell reading-grid">
          <LeftRail
            rows={workMeta}
            note="Penulis Maya bekerja di bawah kawal selia editorial manusia."
          />

          <article className="story-body">
            {sectionSlug && activeSection?.title && (
              <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                {activeSection.title}
              </h2>
            )}
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

        {sections.length > 0 && (
          <SectionNav
            workSlug={work.slug}
            sections={sections}
            activeSlug={activeSection?.slug}
          />
        )}

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
