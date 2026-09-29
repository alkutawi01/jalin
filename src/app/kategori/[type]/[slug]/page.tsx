import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { displayableGenre } from "../../../../lib/reader/genre-display";
import { absoluteUrl } from "../../../../lib/seo";
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
import { WorkCover } from "../../../../components/reader/WorkCover";
import MobileStoryInfo from "../../../../components/reader/MobileStoryInfo";
import { initContentRepository } from "../../../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../../../lib/content/workLoader";
import {
  projectBylineCredits,
  projectEditorialCredits
} from "../../../../lib/reader/credit-projection";
import { buildVerifiedGlossary } from "../../../../lib/reader/verified-glossary";
import {
  projectPublicSections,
  type PublicSectionRef
} from "../../../../lib/reader/public-projection";
import type {
  CharacterMeta,
  StoryInfoData,
  WorkMetaRow
} from "../../../../components/reader/types";
import type { ReadingSection, WorkType } from "../../../../lib/content/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const types: WorkType[] = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
  const params: { type: string; slug: string; sectionSlug?: string }[] = [];

  const repo = await initContentRepository();
  const useRepo = repo.source === "database";

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

export async function generateMetadata({
  params
}: {
  params: Promise<{ type: string; slug: string; sectionSlug?: string }>;
}): Promise<Metadata> {
  const { type, slug, sectionSlug } = await params;
  if (type === "bersiri") return {};

  const work = await getWork(slug);
  if (!work || work.type !== type) return {};

  const typeLabel = TYPE_LABELS[type] ?? type;
  const description = work.dek ?? `${typeLabel} Jalin — ${work.title}.`;
  const hero = work.visuals.find((visual) => visual.role === "hero");

  const sections = work.sections && work.sections.length > 0 ? work.sections : [];
  const primarySlug = sections.length > 0 ? sectionSlug ?? sections[0]!.slug : undefined;
  const canonicalPath =
    type === "novela" && primarySlug
      ? `/kategori/${type}/${slug}/${primarySlug}`
      : `/kategori/${type}/${slug}`;

  return {
    title: work.title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: {
      type: "article",
      title: work.title,
      description,
      url: canonicalPath,
      images: hero?.src ? [{ url: absoluteUrl(hero.src) }] : undefined
    },
    twitter: {
      card: hero?.src ? "summary_large_image" : "summary",
      title: work.title,
      description,
      images: hero?.src ? [absoluteUrl(hero.src)] : undefined
    }
  };
}

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
  if (repo.source === "database") {
    return repo.getWork(slug);
  }
  return getWorkBySlug(slug);
}

async function getWorksByTypeUnified(type: WorkType) {
  const repo = await initContentRepository();
  if (repo.source === "database") {
    return repo.getWorksByType(type);
  }
  return getWorksByType(type);
}

function buildMetaRows(work: Awaited<ReturnType<typeof getWork>>): WorkMetaRow[] {
  if (!work) return [];
  const genre = displayableGenre(work.genre);
  return [
    { label: "Bentuk", value: TYPE_LABELS[work.type] ?? work.type },
    ...(genre ? [{ label: "Genre", value: genre }] : []),
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    ...(work.sourceWork?.language
      ? [{ label: "Bahasa asal", value: work.sourceWork.language }]
      : []),
    ...(work.version ? [{ label: "Versi", value: work.version }] : [])
  ];
}

const MALAY_LANGUAGE_NAMES = new Set(["melayu", "malay", "bahasa melayu"]);

function originalTitleOf(work: { sourceWork?: { title?: string; language?: string } }): string | undefined {
  const source = work.sourceWork;
  if (!source?.title || !source.language) return undefined;
  if (MALAY_LANGUAGE_NAMES.has(source.language.trim().toLowerCase())) return undefined;
  return source.title;
}

function SectionNav({
  workSlug,
  sections,
  activeSlug
}: {
  workSlug: string;
  sections: PublicSectionRef[];
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

function SectionIndexDetails({
  workSlug,
  sections
}: {
  workSlug: string;
  sections: PublicSectionRef[];
}) {
  if (sections.length === 0) return null;
  return (
    <details>
      <summary style={{ cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.75 }}>
        Bab ({sections.length})
      </summary>
      <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.85rem", lineHeight: 1.55 }}>
        {sections.map((section) => (
          <li key={section.slug} style={{ marginBottom: "0.25rem" }}>
            <a href={`/kategori/novela/${workSlug}/${section.slug}`}>
              {section.title || section.slug}
            </a>
          </li>
        ))}
      </ol>
    </details>
  );
}

function RelatedWorks({
  works,
  typeLabel
}: {
  works: {
    slug: string;
    type: string;
    title: string;
    dek?: string;
    readingMinutes?: number;
    hero?: { src: string; alt: string };
    year: string;
  }[];
  typeLabel: string;
}) {
  if (works.length === 0) return null;
  return (
    <section className="related-works">
      <div className="site-shell">
        <header className="section-head">
          <h2>Selepas ini</h2>
          <p className="section-sub">Karya {typeLabel.toLowerCase()} lain daripada Jalin</p>
        </header>
        <div className="related-works-grid">
          {works.map((related) => (
            <a
              key={related.slug}
              className="related-work-card"
              href={`/kategori/${related.type}/${related.slug}`}
            >
              <div className="related-work-cover">
                <WorkCover type={related.type} title={related.title} hero={related.hero} rightsYear={related.year} />
              </div>
              <div className="related-work-body">
                <h3>{related.title}</h3>
                {related.dek ? <p>{related.dek}</p> : null}
                {related.readingMinutes ? <span>± {related.readingMinutes} min</span> : null}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
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

  const glossary = buildVerifiedGlossary(work);
  const byline = projectBylineCredits(work.credits);
  const typeLabel = TYPE_LABELS[type] ?? type;
  const workMeta = buildMetaRows(work);
  const characters: CharacterMeta[] = (work.metadata?.characters ?? []).map(({ name, role }) => ({
    name,
    role
  }));
  const editorial = projectEditorialCredits(work.credits);
  const originalTitle = originalTitleOf(work);

  const rights = `© ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)}`;
  const hero = work.visuals.find((visual) => visual.role === "hero");
  const inlineVisuals = work.visuals.filter((visual) => visual.anchor);

  const sections = work.sections && work.sections.length > 0 ? work.sections : [];

  // The base /kategori/novela/[slug] URL used to silently render the first
  // section's body, duplicating /[slug]/[firstSectionSlug]. Redirect to the
  // section URL so there is one canonical, primary address per chapter.
  if (sections.length > 0 && !sectionSlug) {
    redirect(`/kategori/${type}/${slug}/${sections[0]!.slug}`);
  }

  let activeSection: ReadingSection | undefined;
  let bodyToRender = work.body;

  if (sections.length > 0) {
    activeSection = sections.find((s) => s.slug === sectionSlug);
    if (!activeSection) notFound();
    bodyToRender = activeSection.body;
  }

  const segmentNodes: (string | { visual: (typeof work.visuals)[number] })[] = [];
  let remaining = bodyToRender;
  for (const visual of inlineVisuals) {
    const anchor = visual.anchor ?? "";
    if (!anchor || remaining.indexOf(anchor) < 0) continue;
    const [before, after] = splitBody(remaining, anchor, visual.place ?? "after");
    segmentNodes.push(before);
    segmentNodes.push({ visual });
    remaining = after;
  }
  segmentNodes.push(remaining);

  const publicSections = projectPublicSections(sections);

  const sameTypeWorks = await getWorksByTypeUnified(type as WorkType);
  const relatedWorks = sameTypeWorks
    .filter((w) => w.slug !== work.slug)
    .sort((a, b) => {
      const aDate = a.updatedAt ?? a.publishedAt ?? "";
      const bDate = b.updatedAt ?? b.publishedAt ?? "";
      return bDate.localeCompare(aDate);
    })
    .slice(0, 3)
    .map((w) => {
      const hero = w.visuals.find((visual) => visual.role === "hero");
      return {
        slug: w.slug,
        type: w.type,
        title: w.title,
        dek: w.dek,
        readingMinutes: w.readingMinutes,
        hero: hero ? { src: hero.src, alt: hero.alt } : undefined,
        year: (w.updatedAt ?? w.publishedAt ?? "2026").slice(0, 4)
      };
    });

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    editorial,
    note: work.reader?.note ?? "Penulis Maya bekerja di bawah kawal selia editorial manusia.",
    ...(publicSections.length > 0
      ? {
          bab: publicSections.map((section) => ({
            label: section.title || section.slug,
            href: `/kategori/novela/${work.slug}/${section.slug}`
          }))
        }
      : {})
  };

  return (
    <>
      <SiteHeader active={type as WorkType} />

      <main>
        <StoryHead
          kicker={
            displayableGenre(work.genre)
              ? `${typeLabel} · ${displayableGenre(work.genre)}`
              : typeLabel
          }
          title={work.title}
          dek={work.dek ?? ""}
          byline={byline}
          originalTitle={originalTitle}
        />

        <div className="site-shell">
          <EditorialImage
            kind="hero"
            src={hero?.src ?? ""}
            alt={hero?.alt ?? ""}
            rights={rights}
          />
        </div>

        {sections.length > 0 && (
          <SectionNav
            workSlug={work.slug}
            sections={publicSections}
            activeSlug={activeSection?.slug}
          />
        )}

        <div className="site-shell reading-grid">
          <LeftRail
            rows={workMeta}
            note="Penulis Maya bekerja di bawah kawal selia editorial manusia."
          >
            {publicSections.length > 0 ? (
              <SectionIndexDetails
                workSlug={work.slug}
                sections={publicSections}
              />
            ) : null}
          </LeftRail>

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
            sections={publicSections}
            activeSlug={activeSection?.slug}
          />
        )}

        <StoryEnd title={work.title} />

        <RelatedWorks works={relatedWorks} typeLabel={typeLabel} />

        <MobileStoryInfo data={mobileInfo} />
      </main>

      <SiteFooter />
    </>
  );
}
