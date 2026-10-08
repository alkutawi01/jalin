import { displayVersion } from "@/lib/admin/version-label";
import { ContinueNav } from "./ReadingNav";
import { ChapterHead, NovelaIntro, readingMinutesOf, type ChapterRow } from "./NovelaChapters";
import { visibleCharacters } from "../../lib/reader/visible-characters";
import { publicPlaces, publicTimes } from "../../lib/reader/places";
import { notFound } from "next/navigation";
import { displayableGenre } from "../../lib/reader/genre-display";
import { chapterTitleBesideNumber } from "../../lib/reader/chapter-label";
import { classifyFragmen, isIndonesianLanguage } from "../../lib/content/fragmen-kind";
import { jsonLdString, workJsonLd } from "../../lib/seo-jsonld";
import {
  EditorialImage,
  LeftRail,
  RightRail,
  SiteFooter,
  SiteHeader,
  EditorNote,
  StoryEnd,
  StoryHead
} from "./StoryChrome";
import StoryMarkdown from "./StoryMarkdown";
import FootnoteList from "./FootnoteList";
import FootnoteMargin from "./FootnoteMargin";
import ReadingProgress from "./ReadingProgress";
import ReaderTypography from "./ReaderTypography";
import { extractFootnotes, markFootnoteReferences } from "../../lib/reader/footnotes";
import { WorkCover } from "./WorkCover";
import { extractInlineChapters } from "../../lib/reader/inline-chapters";
import { placeVisuals } from "../../lib/reader/place-visuals";
import { chapterHeroOf, visualsForPage } from "../../lib/reader/chapter-visuals";
import { firstGlossaryBySegment } from "../../lib/reader/glossary-first";
import MobileStoryInfo from "./MobileStoryInfo";
import { isDerivativeType } from "../../lib/credit-roles";
import { initContentRepository } from "../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../lib/content/workLoader";
import {
  disclosureNoteFor,
  bylineFor,
  projectEditorialCredits
} from "../../lib/reader/credit-projection";
import { buildVerifiedGlossary } from "../../lib/reader/verified-glossary";
import {
  projectPublicSections,
  type PublicSectionRef
} from "../../lib/reader/public-projection";
import type {
  CharacterMeta,
  StoryInfoData,
  WorkMetaRow
} from "./types";
import type { ReadingSection, Work, WorkType } from "../../lib/content/types";

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

async function getWorksByTypeUnified(type: WorkType) {
  const repo = await initContentRepository();
  if (repo.source === "database") {
    return repo.getWorksByType(type);
  }
  return getWorksByType(type);
}

/** The "Tentang karya" table: which edition the work came from. Rows with nothing to show are left out. */
function sourceRows(source: { title?: string; author?: string; language?: string; firstPublished?: number; publisher?: string; editionYear?: number; printing?: string; editor?: string; translator?: string; isbn?: string; locator?: string } | undefined): WorkMetaRow[] {
  if (!source) return [];
  const printing = [source.editionYear ? `${source.editionYear}` : "", source.printing ?? ""].filter(Boolean).join(", ");
  const rows: Array<[string, string | undefined]> = [
    ["Karya asal", source.title],
    ["Pengarang asal", source.author],
    ["Bahasa asal", source.language],
    ["Terbit pertama", source.firstPublished ? String(source.firstPublished) : undefined],
    ["Penerbit", source.publisher],
    ["Cetakan", printing || undefined],
    ["Penyunting", source.editor],
    ["Penterjemah", source.translator],
    ["ISBN", source.isbn],
    ["Lokasi petikan", source.locator]
  ];
  return rows.filter((r): r is [string, string] => Boolean(r[1])).map(([label, value]) => ({ label, value, ...(label === "Karya asal" ? { italic: true } : {}) }));
}

function buildMetaRows(work: Work | undefined): WorkMetaRow[] {
  if (!work) return [];
  const genre = displayableGenre(work.genre);
  const fragmenKind = work.type === "fragmen"
    ? classifyFragmen(work.sourceWork?.language, work.metadata?.fragmenTextLanguage)
    : "belum_ditentukan";
  const formLabel = fragmenKind === "asal" ? "Fragmen asal"
    : fragmenKind === "terjemahan" ? "Fragmen terjemahan"
      : TYPE_LABELS[work.type] ?? work.type;
  return [
    { label: "Jenis", value: formLabel },
    ...(genre ? [{ label: "Genre", value: genre }] : []),
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} minit` : "—" },
    ...sourceRows(work.sourceWork),
    ...((work.versionLabel || work.version) ? [{ label: "Versi", value: displayVersion(work.versionLabel || work.version) }] : [])
  ];
}

function originalTitleOf(work: { title: string; sourceWork?: { title?: string } }): string | undefined {
  const source = work.sourceWork;
  if (!source?.title) return undefined;
  if (source.title.trim().localeCompare(work.title.trim(), "ms", { sensitivity: "base" }) === 0) return undefined;
  return source.title;
}

function SectionIndexDetails({ items }: { items: { label: string; href: string }[] }) {
  if (items.length === 0) return null;
  return (
    <details className="chapter-index">
      <summary style={{ cursor: "pointer", fontSize: "0.78rem", letterSpacing: "0.06em", textTransform: "uppercase", opacity: 1, color: "#4b5f64" }}>
        Senarai bab ({items.length})
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
                {related.readingMinutes ? <span>± {related.readingMinutes} minit</span> : null}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The whole story page for one work. The public page and the editor's preview both render it, so the preview is the page a
 * reader would get. `preview` is set only by the preview: chapter links then stay in the preview (?bab=slug) and nothing
 * that is for search engines (structured data) is written.
 */
export default async function WorkView({
  work,
  sectionSlug,
  preview
}: {
  work: Work;
  sectionSlug?: string;
  preview?: { base: string };
}) {
  const type = work.type;
  const chapterHref = (slug: string) => (preview ? `${preview.base}?bab=${encodeURIComponent(slug)}` : `/kategori/novela/${work.slug}/${slug}`);
  const workHref = preview ? preview.base : `/kategori/${work.type}/${work.slug}`;

  const glossary = buildVerifiedGlossary(work);
  const byline = bylineFor(work);
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

  // The base /kategori/novela/[slug] URL is the novela's own page: the blurb, who made it, and every chapter.
  // Each chapter has its own address, so there is one canonical URL per chapter and one for the whole novela.
  const landing = sections.length > 0 && !sectionSlug;

  // A work without chapters has one address. Any extra path segment (/kategori/cerpen/kerusi-di-beranda/apa-apa) used to show the whole
  // work again at that address: unlimited duplicate pages for a search engine.
  if (sections.length === 0 && sectionSlug) notFound();

  let activeSection: ReadingSection | undefined;
  let bodyToRender = work.body;

  if (sections.length > 0 && !landing) {
    activeSection = sections.find((s) => s.slug === sectionSlug);
    if (!activeSection) notFound();
    bodyToRender = activeSection.body;
  }

  // A chapter's own images (hero and inline) belong to that chapter; the work's other images stay with the work.
  const visualsForBody = visualsForPage(work.visuals, activeSection?.slug, bodyToRender);
  // Footnotes: the notes are taken out of the text and the references marked, before the text is cut around its images.
  const footnotes = extractFootnotes(bodyToRender);
  const segmentNodes = placeVisuals(markFootnoteReferences(footnotes.body, footnotes.numbers), visualsForBody);
  const chapterHero = chapterHeroOf(work.visuals, activeSection?.slug);
  const segmentGlossaries = firstGlossaryBySegment(segmentNodes, glossary);

  const publicSections = projectPublicSections(sections);
  const sectionIndex = activeSection ? publicSections.findIndex((section) => section.slug === activeSection.slug) : -1;
  const prevSection = sectionIndex > 0 ? publicSections[sectionIndex - 1] : undefined;
  const nextSection = sectionIndex >= 0 && sectionIndex < publicSections.length - 1 ? publicSections[sectionIndex + 1] : undefined;
  // A chapter only introduces the characters who have appeared so far, so early chapters do not spoil later ones.
  const characters = visibleCharacters(allCharacters, sections.map((section) => section.slug), activeSection?.slug ?? (landing ? sections[0]?.slug : undefined))
    .map(({ name, role }) => ({ name, role }));
  const disclosureNote = disclosureNoteFor(work);
  const places = publicPlaces(work.metadata);
  const times = publicTimes(work.metadata);

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
          href: chapterHref(section.slug)
        }))
      : inlineChapters.length > 1
        ? inlineChapters.map((chapter) => ({ label: chapter.label, href: `#${chapter.id}` }))
        : [];

  const chapterRows: ChapterRow[] = sections.map((section, i) => ({
    slug: section.slug,
    title: section.title || `Bab ${i + 1}`,
    minutes: readingMinutesOf(section.body),
    href: chapterHref(section.slug)
  }));

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    places,
    times,
    editorial,
    note: disclosureNote,
    ...(chapterItems.length > 0 ? { bab: chapterItems } : {})
  };

  const articleNode = (
      <article className="story-body">
        {segmentNodes.map((node, index) => {
          if (typeof node === "string") {
            return (
              <StoryMarkdown key={index} glossary={segmentGlossaries[index]} footnoteNumbers={footnotes.numbers}>
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
                crop={node.crop}
              />
            );
          }
          return null;
        })}
        <FootnoteList notes={footnotes.notes} />
      </article>
  );

  return (
    <>
      <SiteHeader active={type as WorkType} />
      <ReaderTypography />
      {landing ? null : <ReadingProgress />}

      <main id="kandungan" tabIndex={-1}>
        {sectionIndex >= 0 ? null : (
          <StoryHead
            kicker={
              [
                typeLabel,
                displayableGenre(work.genre),
                landing ? `${sections.length} bab` : ""
              ]
                .filter(Boolean)
                .join(" · ")
            }
            title={work.title}
            dek={work.dek ?? ""}
            byline={byline}
            originalTitle={originalTitle}
            originalAuthorBesideTitle={isDerivativeType(work.type)}
            hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights, crop: hero.crop } : undefined}
          />
        )}

        {/* A chapter's head and picture sit above the columns, so the two side columns start level with the first paragraph. */}
        {sectionIndex >= 0 ? (
          <div className="site-shell reading-grid chapter-top">
            <div className="left-rail" aria-hidden="true" />
            <div className="chapter-column">
              <ChapterHead workTitle={work.title} workHref={workHref} rows={chapterRows} index={sectionIndex} />
              {/* A chapter shows its own hero when it has one; until then the novela's hero stands in. */}
              {(chapterHero ?? hero)?.src ? <EditorialImage src={(chapterHero ?? hero)!.src} alt={(chapterHero ?? hero)!.alt ?? ""} rights={rights} kind="hero" crop={(chapterHero ?? hero)!.crop} /> : null}
            </div>
            <div className="right-rail" aria-hidden="true" />
          </div>
        ) : null}

        {/* On a narrow screen the side columns are gone; this is where a reader opens "Tentang karya" (and the characters, places and editorial). */}
        <div className={`site-shell mobile-info-row${characters.length + places.length + times.length > 0 ? " has-rail" : ""}`}>
          <MobileStoryInfo data={mobileInfo} />
        </div>

        <div className={`site-shell reading-grid${!landing && footnotes.notes.length > 0 ? " has-margin-notes" : ""}`}>
          <LeftRail
            rows={workMeta}
            note={disclosureNote}
            editorial={editorial}
          >
            {/* A chapter page has its own "Senarai Bab" in its head, so this one is only for a novela whose chapters are headings in one text. */}
            {landing || sectionIndex >= 0 ? null : <SectionIndexDetails items={chapterItems} />}
          </LeftRail>

          {landing ? <NovelaIntro rows={chapterRows} /> : articleNode}

          <RightRail characters={characters} places={places} times={times} info={<MobileStoryInfo data={mobileInfo} />} />
          {!landing && footnotes.notes.length > 0 ? <FootnoteMargin notes={footnotes.notes.map((note) => ({ number: note.number, text: note.text }))} /> : null}
        </div>

        {sections.length > 0 && !landing ? (
          <ContinueNav
            name="Selepas bab ini"
            next={nextSection ? { href: chapterHref(nextSection.slug), label: `Bab ${sectionIndex + 2}`, title: chapterTitleBesideNumber(nextSection.title, sectionIndex + 2) } : undefined}
            prev={prevSection ? { href: chapterHref(prevSection.slug), label: `Bab ${sectionIndex}`, title: chapterTitleBesideNumber(prevSection.title, sectionIndex) } : undefined}
          />
        ) : null}

        {/* On a novela the note closes the last chapter only. */}
        {sections.length === 0 || (!landing && activeSection?.slug === sections[sections.length - 1]?.slug) ? (
          <EditorNote note={work.metadata?.editorNote} />
        ) : null}

        {/* "Tamat" marks the end of the work, so a chapter that has a next chapter does not show it. */}
        {sections.length === 0 || (!landing && !nextSection) ? <StoryEnd title={work.title} /> : null}

        {/* Other works are offered where the reader has finished or is choosing, not between two chapters of a novela (whose next step is the next chapter). */}
        {activeSection && nextSection ? null : <RelatedWorks works={relatedWorks} typeLabel={typeLabel} />}

        {preview ? null : <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: jsonLdString(
              workJsonLd(
                {
                  slug: work.slug,
                  title: work.title,
                  type: work.type,
                  dek: work.dek,
                  genre: displayableGenre(work.genre),
                  audience: work.audience,
                  publishedAt: work.publishedAt,
                  updatedAt: work.updatedAt,
                  heroSrc: hero?.src,
                  inLanguage: isIndonesianLanguage(work.metadata?.fragmenTextLanguage) ? "id" : "ms",
                  authors: isDerivativeType(work.type) ? [] : byline.map((person) => person.name),
                  basedOn: isDerivativeType(work.type) ? { title: originalTitle, authors: byline.map((person) => person.name) } : undefined,
                  sections: sections.map((section) => ({ slug: section.slug, title: section.title ?? undefined }))
                },
                activeSection?.slug
              )
            )
          }}
        />}
      </main>

      <SiteFooter />
    </>
  );
}
