import { notFound } from "next/navigation";
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
  projectBylineCredits,
  projectEditorialCredits
} from "../../../../../lib/reader/credit-projection";
import { buildVerifiedGlossary } from "../../../../../lib/reader/verified-glossary";
import type {
  CharacterMeta,
  StoryInfoData,
  WorkMetaRow
} from "../../../../../components/reader/types";
import type { SeriesEpisodeRef, WorkType } from "../../../../../lib/content/types";

export const dynamicParams = false;

export async function generateStaticParams() {
  const params: { seriesSlug: string; episodeSlug: string }[] = [];
  try {
    const repo = await initContentRepository();
    if (repo.constructor.name === "DatabaseContentRepository") {
      const seriesList = repo.getPublishedSeries();
      for (const series of seriesList) {
        const episodes = repo.getPublishedSeriesEpisodes(series.id);
        for (const ep of episodes) {
          params.push({ seriesSlug: series.slug, episodeSlug: ep.slug });
        }
      }
    }
  } catch {
    // markdown mode / no DB: fall through
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
  const isDb = repo.constructor.name === "DatabaseContentRepository";

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

  const workMeta: WorkMetaRow[] = [
    { label: "Bentuk", value: `${typeLabel} · Episod ${episodeIndex >= 0 ? episodeIndex + 1 : "—"}` },
    { label: "Siri", value: series.title },
    { label: "Genre", value: work.genre ?? series.genre ?? "Keluarga" },
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    {
      label: "Status",
      value: series.status === "completed" ? "Siri tamat" : "Siri berterusan"
    },
    { label: "ID", value: work.id },
    { label: "Versi", value: work.version }
  ];

  const characters: CharacterMeta[] = work.metadata?.characters ?? [];

  const editorial = projectEditorialCredits(work.credits);

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
        />

        <div className="site-shell">
          <EditorialImage
            kind="hero"
            src={hero?.src ?? ""}
            alt={hero?.alt ?? ""}
            rights={rights}
          />
        </div>

        <EpisodeNav
          seriesSlug={series.slug}
          episodes={episodes}
          currentSlug={work.slug}
        />

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
