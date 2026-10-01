import { notFound } from "next/navigation";
import { displayableGenre } from "../../../../../lib/reader/genre-display";
import {
  EditorialImage,
  LeftRail,
  RightRail,
  SiteFooter,
  SiteHeader,
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

function EpisodeNav({
  seriesSlug,
  episodes,
  currentSlug
}: {
  seriesSlug: string;
  episodes: SeriesEpisodeRef[];
  currentSlug: string;
}) {
  const index = episodes.findIndex((e) => e.slug === currentSlug);
  const prev = index > 0 ? episodes[index - 1] : undefined;
  const next = index >= 0 && index < episodes.length - 1 ? episodes[index + 1] : undefined;

  if (index < 0) return null;

  return (
    <nav className="site-shell episode-nav" aria-label="Navigasi episod" style={{
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
        Episod {index + 1} / {episodes.length}
      </span>
      <span style={{ display: "flex", gap: "0.75rem" }}>
        <a href={`/kategori/bersiri/${seriesSlug}`} rel="back">
          ← Siri
        </a>
        {prev ? (
          <a href={`/kategori/bersiri/${seriesSlug}/${prev.slug}`} rel="prev">
            ← Sebelumnya
          </a>
        ) : (
          <span style={{ opacity: 0.4 }} aria-disabled="true">← Sebelumnya</span>
        )}
        {next ? (
          <a href={`/kategori/bersiri/${seriesSlug}/${next.slug}`} rel="next">
            Seterusnya →
          </a>
        ) : (
          <span style={{ opacity: 0.4 }} aria-disabled="true">Seterusnya →</span>
        )}
      </span>
    </nav>
  );
}

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

      <main>
        <div className="site-shell" style={{ maxWidth: "42rem", margin: "0 auto 0.5rem", padding: "1rem 1.25rem 0" }}>
          <a href={`/kategori/bersiri/${series.slug}`} style={{ fontSize: "0.85rem", opacity: 0.75 }}>
            ← Kembali ke {series.title}
          </a>
        </div>

        <StoryHead
          kicker={`${typeLabel} · ${series.title}${episodeIndex >= 0 ? ` · Episod ${episodeIndex + 1}` : ""}`}
          title={work.title}
          dek={work.dek ?? ""}
          byline={byline}
          hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights } : undefined}
        />


        <EpisodeNav
          seriesSlug={series.slug}
          episodes={episodes}
          currentSlug={work.slug}
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

        <EpisodeNav
          seriesSlug={series.slug}
          episodes={episodes}
          currentSlug={work.slug}
        />

        <StoryEnd title={work.title} />
      </main>

      <SiteFooter />
    </>
  );
}
