import { visibleCharacters } from "../../../../lib/reader/visible-characters";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { displayableGenre } from "../../../../lib/reader/genre-display";
import { classifyFragmen } from "../../../../lib/content/fragmen-kind";
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
import { extractInlineChapters } from "../../../../lib/reader/inline-chapters";
import { placeVisuals } from "../../../../lib/reader/place-visuals";
import { firstGlossaryBySegment } from "../../../../lib/reader/glossary-first";
import MobileStoryInfo from "../../../../components/reader/MobileStoryInfo";
import { initContentRepository } from "../../../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../../../lib/content/workLoader";
import {
  disclosureNoteFor,
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

// Editorial changes must be visible on work pages just as on the dynamic homepage.
export const dynamic = "force-dynamic";
export const dynamicParams = true;

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
  const fragmenKind = work.type === "fragmen"
    ? classifyFragmen(work.sourceWork?.language, work.metadata?.fragmenTextLanguage)
    : "belum_ditentukan";
  const formLabel = fragmenKind === "asal" ? "Fragmen asal"
    : fragmenKind === "terjemahan" ? "Fragmen terjemahan"
      : TYPE_LABELS[work.type] ?? work.type;
  return [
    { label: "Bentuk", value: formLabel },
    ...(genre ? [{ label: "Genre", value: genre }] : []),
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    ...(work.sourceWork?.language
      ? [{ label: "Bahasa asal", value: work.sourceWork.language }]
      : []),
    ...(work.version ? [{ label: "Versi", value: work.version }] : [])
  ];
}

function originalTitleOf(work: { title: string; sourceWork?: { title?: string } }): string | undefined {
  const source = work.sourceWork;
  if (!source?.title) return undefined;
  if (source.title.trim().localeCompare(work.title.trim(), "ms", { sensitivity: "base" }) === 0) return undefined;
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

function SectionIndexDetails({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  return (
    <details>
      <summary style={{ cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 0.75 }}>
        Bab ({items.length})
      </summary>
      <ol style={{ margin: "0.5rem 0 0", paddingLeft: "1.1rem", fontSize: "0.85rem", lineHeight: 1.55 }}>
        {items.map((item) => (
          <li key={item.href} style={{ marginBottom: "0.25rem" }}>
            <a href={item.href}>{item.label}</a>
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
  // The grid shows one full-width card, two half-width cards, or three thirds.
  // Accurate sizes keep the artwork sharp on high-density displays without
  // downloading the full hero for every below-the-fold card.
  const coverSizes = works.length === 1
    ? "(max-width: 620px) calc(100vw - 40px), 580px"
    : works.length === 2
      ? "(max-width: 500px) calc(100vw - 40px), (max-width: 820px) 45vw, (max-width: 1244px) 47vw, 580px"
      : "(max-width: 500px) calc(100vw - 40px), (max-width: 740px) 45vw, (max-width: 1244px) 31vw, 380px";
  return (
    <section className="related-works">
      <div className="site-shell">
        <header className="section-head">
          <h2>Selepas ini</h2>
          <p className="section-sub">Karya {typeLabel.toLowerCase()} lain daripada Jalin</p>
        </header>
        <div className={`related-works-grid${works.length === 1 ? " related-works-grid-single" : ""}`}>
          {works.map((related) => (
            <a
              key={related.slug}
              className="related-work-card"
              href={`/kategori/${related.type}/${related.slug}`}
            >
              <div className="related-work-cover">
                <WorkCover type={related.type} title={related.title} hero={related.hero} sizes={coverSizes} quality={85} rightsYear={related.year} />
              </div>
              <div className="related-work-body">
                <h3 style={{ fontStyle: "normal" }}>{related.title}</h3>
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
  const allCharacters: CharacterMeta[] = (work.metadata?.characters ?? []).map(({ name, role, firstAppearanceSection }) => ({
    name,
    role,
    firstAppearanceSection
  }));
  const editorial = projectEditorialCredits(work.credits);
  const originalTitle = originalTitleOf(work);

  const rights = `© ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)}`;
  const hero = work.visuals.find((visual) => visual.role === "hero");

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

  const segmentNodes = placeVisuals(bodyToRender, work.visuals);
  const segmentGlossaries = firstGlossaryBySegment(segmentNodes, glossary);

  const publicSections = projectPublicSections(sections);
  // A chapter only introduces the characters who have appeared so far, so early chapters do not spoil later ones.
  const characters = visibleCharacters(allCharacters, sections.map((section) => section.slug), activeSection?.slug)
    .map(({ name, role }) => ({ name, role }));
  const disclosureNote = disclosureNoteFor(work);

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

  // DB novelas have real sections (separate pages); a Markdown novela keeps its
  // chapters as "## Bab N" headings in one body, so link to those in-page anchors.
  const inlineChapters =
    publicSections.length === 0 && work.type === "novela" ? extractInlineChapters(work.body) : [];
  const chapterItems: { label: string; href: string }[] =
    publicSections.length > 0
      ? publicSections.map((section) => ({
          label: section.title || section.slug,
          href: `/kategori/novela/${work.slug}/${section.slug}`
        }))
      : inlineChapters.length > 1
        ? inlineChapters.map((chapter) => ({ label: chapter.label, href: `#${chapter.id}` }))
        : [];

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    editorial,
    note: disclosureNote,
    ...(chapterItems.length > 0 ? { bab: chapterItems } : {})
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
          hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights } : undefined}
        />


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
            note={disclosureNote}
          >
            <SectionIndexDetails items={chapterItems} />
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
                  <StoryMarkdown key={index} glossary={segmentGlossaries[index]}>
                    {node}
                  </StoryMarkdown>
                );
              }
              if (typeof node !== "string") {
                return (
                  <EditorialImage
                    key={index}
                    src={node.src}
                    alt={node.alt}
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
