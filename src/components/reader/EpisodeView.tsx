import { displayVersion } from "@/lib/admin/version-label";
import { ContinueNav } from "./ReadingNav";
import { episodeJsonLd, jsonLdString } from "../../lib/seo-jsonld";
import { displayableGenre } from "../../lib/reader/genre-display";
import { episodeHeroOf } from "../../lib/reader/chapter-visuals";
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
import MobileStoryInfo from "./MobileStoryInfo";
import { publicPlaces, publicTimes } from "../../lib/reader/places";
import { initContentRepository } from "../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../lib/content/workLoader";
import {
  disclosureNoteFor,
  bylineFor,
  projectEditorialCredits
} from "../../lib/reader/credit-projection";
import { buildVerifiedGlossary } from "../../lib/reader/verified-glossary";
import { placeVisuals } from "../../lib/reader/place-visuals";
import { firstGlossaryBySegment } from "../../lib/reader/glossary-first";
import type {
  CharacterMeta,
  StoryInfoData,
  WorkMetaRow
} from "./types";
import type { SeriesEpisodeRef, Work } from "../../lib/content/types";

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

/**
 * The whole page of one series episode. The public page and the editor's preview both render it, so the preview is the page a
 * reader would get. `preview` is set only by the preview: nothing for search engines (structured data) is written then.
 */
export default function EpisodeView({
  work,
  episodes,
  preview
}: {
  work: Work;
  episodes: SeriesEpisodeRef[];
  preview?: boolean;
}) {
  const series = work.series;
  if (!series) return null;

  const glossary = buildVerifiedGlossary(work);

  const byline = bylineFor(work);

  const episodeIndex = episodes.findIndex((e) => e.slug === work.slug);
  const prevEpisode = episodeIndex > 0 ? episodes[episodeIndex - 1] : undefined;
  const nextEpisode = episodeIndex >= 0 && episodeIndex < episodes.length - 1 ? episodes[episodeIndex + 1] : undefined;
  // The episode number is the one the editor gave it (position), as on the homepage and the series page; its place in the list is not the number when an episode is unpublished.
  const episodeNumber = episodeIndex >= 0 ? episodes[episodeIndex]!.position : undefined;
  const typeLabel = TYPE_LABELS["bersiri"];
  const genre = displayableGenre(work.genre) ?? displayableGenre(series.genre);

  const workMeta: WorkMetaRow[] = [
    { label: "Jenis", value: typeLabel },
    { label: "Judul", value: series.title },
    { label: "Episod", value: episodeNumber !== undefined ? String(episodeNumber) : "—" },
    ...(genre ? [{ label: "Genre", value: genre }] : []),
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} minit` : "—" },
    {
      label: "Status",
      value: series.status === "completed" ? "Tamat" : "Masih diteruskan"
    },
    { label: "Versi", value: displayVersion(work.versionLabel || work.version) }
  ];

  const characters: CharacterMeta[] = work.metadata?.characters ?? [];
  const places = publicPlaces(work.metadata);
  const times = publicTimes(work.metadata);

  const editorial = projectEditorialCredits(work.credits);

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    places,
    times,
    editorial,
    note: disclosureNoteFor(work)
  };

  const rights = `© ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)}`;
  const hero = episodeHeroOf(work.visuals.find((visual) => visual.role === "hero"), series.hero);
  const footnotes = extractFootnotes(work.body);
  const segmentNodes = placeVisuals(markFootnoteReferences(footnotes.body, footnotes.numbers), work.visuals);
  const segmentGlossaries = firstGlossaryBySegment(segmentNodes, glossary);

  return (
    <>
      <SiteHeader active="bersiri" />
      <ReaderTypography />
      <ReadingProgress />

      <main id="kandungan" tabIndex={-1}>
        <StoryHead
          // The same quiet kicker as a cerpen ("Cerpen · Keluarga"); which series and episode this is goes in a line under the dek.
          kicker={[typeLabel, genre].filter(Boolean).join(" · ")}
          title={work.title}
          dek={work.dek ?? ""}
          contextLine={
            <>
              {episodeNumber !== undefined ? `Episod ${episodeNumber} · ` : ""}
              <a href={`/kategori/bersiri/${series.slug}`}>{series.title}</a>
            </>
          }
          byline={byline}
          hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights, crop: hero.crop } : undefined}
        />


        {/* On a narrow screen the side columns are gone; this is where a reader opens "Tentang karya" (and the characters, places and editorial). */}
        <div className={`site-shell mobile-info-row${characters.length + places.length + times.length > 0 ? " has-rail" : ""}`}>
          <MobileStoryInfo data={mobileInfo} />
        </div>

        <div className={`site-shell reading-grid${footnotes.notes.length > 0 ? " has-margin-notes" : ""}`}>
          <LeftRail
            rows={workMeta}
            note={disclosureNoteFor(work)}
            editorial={editorial}
          />

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

          <RightRail characters={characters} places={places} times={times} info={<MobileStoryInfo data={mobileInfo} />} />
          {footnotes.notes.length > 0 ? <FootnoteMargin notes={footnotes.notes.map((note) => ({ number: note.number, text: note.text }))} /> : null}
        </div>

        <ContinueNav
          name="Selepas episod ini"
          next={nextEpisode ? { href: `/kategori/bersiri/${series.slug}/${nextEpisode.slug}`, label: `Episod ${nextEpisode.position}`, title: nextEpisode.title } : undefined}
          prev={prevEpisode ? { href: `/kategori/bersiri/${series.slug}/${prevEpisode.slug}`, label: `Episod ${prevEpisode.position}`, title: prevEpisode.title } : undefined}
          back={{ href: `/kategori/bersiri/${series.slug}`, label: "Semua episod" }}
          endNote={series.status === "completed" ? "Ini episod terakhir siri ini." : "Ini episod terkini. Episod seterusnya belum diterbitkan."}
        />

        <EditorNote note={work.metadata?.editorNote} />

        {/* "Tamat" marks the end of the work, so an episode that has a next episode does not show it. The newest episode of a
            series that is still going on is not the end either: it said "Tamat" under a status of "Masih diteruskan". */}
        {!nextEpisode ? <StoryEnd title={work.title} label={series.status === "completed" ? "Tamat" : "Bersambung"} /> : null}
      </main>

      {preview ? null : <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdString(
            episodeJsonLd(
              {
                slug: work.slug,
                title: work.title,
                type: work.type,
                dek: work.dek,
                genre: genre,
                audience: work.audience,
                publishedAt: work.publishedAt,
                updatedAt: work.updatedAt,
                heroSrc: hero?.src,
                authors: byline.map((person) => person.name),
                sections: []
              },
              { slug: series.slug, title: series.title },
              episodeNumber ?? 1
            )
          )
        }}
      />}

      <SiteFooter />
    </>
  );
}
