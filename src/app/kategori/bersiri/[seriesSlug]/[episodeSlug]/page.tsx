import { ContinueNav, Crumbs } from "../../../../../components/reader/ReadingNav";
import { notFound } from "next/navigation";
import { displayableGenre } from "../../../../../lib/reader/genre-display";
import {
  EditorialImage,
  LeftRail,
  RightRail,
  SiteFooter,
  SiteHeader,
  EditorNote,
  StoryEnd,
  StoryHead
} from "../../../../../components/reader/StoryChrome";
import StoryMarkdown from "../../../../../components/reader/StoryMarkdown";
import MobileStoryInfo from "../../../../../components/reader/MobileStoryInfo";
import { initContentRepository } from "../../../../../lib/content";
import { getWorkBySlug, getWorksByType } from "../../../../../lib/content/workLoader";
import {
  disclosureNoteFor,
  projectBylineCredits,
  projectEditorialCredits
} from "../../../../../lib/reader/credit-projection";
import { buildVerifiedGlossary } from "../../../../../lib/reader/verified-glossary";
import { placeVisuals } from "../../../../../lib/reader/place-visuals";
import { firstGlossaryBySegment } from "../../../../../lib/reader/glossary-first";
import type {
  CharacterMeta,
  StoryInfoData,
  WorkMetaRow
} from "../../../../../components/reader/types";
import type { SeriesEpisodeRef, WorkType } from "../../../../../lib/content/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;

const TYPE_LABELS: Record<string, string> = {
  cerpen: "Cerpen",
  novela: "Novela",
  bersiri: "Bersiri",
  fragmen: "Fragmen",
  sinopsis: "Sinopsis"
};

export default async function EpisodePage({
  params
}: {
  params: Promise<{ seriesSlug: string; episodeSlug: string }>;
}) {
  const { seriesSlug, episodeSlug } = await params;

  const repo = await initContentRepository();
  const isDb = repo.source === "database";

  let work;
  if (isDb) {
    work = repo.getEpisodeBySeriesAndSlug(seriesSlug, episodeSlug);
    if (!work) {
      // Fallback: resolve via flat work then verify series context.
      const flat = repo.getWork(episodeSlug);
      if (flat && flat.series?.slug === seriesSlug && flat.type === "bersiri") {
        work = flat;
      }
    }
  } else {
    work = getWorkBySlug(episodeSlug);
    if (work && work.series?.slug !== seriesSlug) work = undefined;
  }

  if (!work || work.type !== "bersiri") notFound();
  if (!work.series) notFound();

  const series = work.series;
  const episodes: SeriesEpisodeRef[] = isDb
    ? repo.getPublishedSeriesEpisodes(series.id)
    : [];

  const glossary = buildVerifiedGlossary(work);

  const byline = projectBylineCredits(work.credits);

  const episodeIndex = episodes.findIndex((e) => e.slug === work.slug);
  const prevEpisode = episodeIndex > 0 ? episodes[episodeIndex - 1] : undefined;
  const nextEpisode = episodeIndex >= 0 && episodeIndex < episodes.length - 1 ? episodes[episodeIndex + 1] : undefined;
  const typeLabel = TYPE_LABELS["bersiri"];
  const genre = displayableGenre(work.genre) ?? displayableGenre(series.genre);

  const workMeta: WorkMetaRow[] = [
    { label: "Bentuk", value: `${typeLabel} · Episod ${episodeIndex >= 0 ? episodeIndex + 1 : "—"}` },
    { label: "Siri", value: series.title },
    ...(genre ? [{ label: "Genre", value: genre }] : []),
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    {
      label: "Status",
      value: series.status === "completed" ? "Siri tamat" : "Siri berterusan"
    },
    { label: "Versi", value: work.version }
  ];

  const characters: CharacterMeta[] = work.metadata?.characters ?? [];

  const editorial = projectEditorialCredits(work.credits);

  const mobileInfo: StoryInfoData = {
    work: workMeta,
    characters,
    editorial,
    note: disclosureNoteFor(work)
  };

  const rights = `© ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)}`;
  const hero = work.visuals.find((visual) => visual.role === "hero");
  const segmentNodes = placeVisuals(work.body, work.visuals);
  const segmentGlossaries = firstGlossaryBySegment(segmentNodes, glossary);

  return (
    <>
      <SiteHeader active="bersiri" />

      <main id="kandungan" tabIndex={-1}>
        <StoryHead
          kicker={
            <Crumbs
              items={[
                { label: "Bersiri", href: "/kategori/bersiri" },
                { label: series.title, href: `/kategori/bersiri/${series.slug}` },
                { label: episodeIndex >= 0 ? `Episod ${episodeIndex + 1} daripada ${episodes.length}` : "Episod" }
              ]}
            />
          }
          title={work.title}
          dek={work.dek ?? ""}
          byline={byline}
          hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights } : undefined}
        />


        <div className="site-shell reading-grid">
          <LeftRail
            rows={workMeta}
            note={disclosureNoteFor(work)}
          />

          <article className="story-body">
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

        <ContinueNav
          name="Selepas episod ini"
          next={nextEpisode ? { href: `/kategori/bersiri/${series.slug}/${nextEpisode.slug}`, label: `Episod ${episodeIndex + 2}`, title: nextEpisode.title } : undefined}
          prev={prevEpisode ? { href: `/kategori/bersiri/${series.slug}/${prevEpisode.slug}`, label: `Episod ${episodeIndex}`, title: prevEpisode.title } : undefined}
          back={{ href: `/kategori/bersiri/${series.slug}`, label: "Semua episod" }}
          endNote={series.status === "completed" ? "Ini episod terakhir siri ini." : "Ini episod terkini. Episod seterusnya belum diterbitkan."}
        />

        <EditorNote note={work.metadata?.editorNote} />

        {/* "Tamat" marks the end of the work, so an episode that has a next episode does not show it. */}
        {!nextEpisode ? <StoryEnd title={work.title} /> : null}
      </main>

      <SiteFooter />
    </>
  );
}
