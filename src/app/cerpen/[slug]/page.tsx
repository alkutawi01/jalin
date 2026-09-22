import { notFound } from "next/navigation";
import {
  EditorialImage,
  LeftRail,
  RightRail,
  SiteFooter,
  SiteHeader,
  StoryEnd,
  StoryHead
} from "../../../components/reader/StoryChrome";
import StoryMarkdown from "../../../components/reader/StoryMarkdown";
import MobileStoryInfo from "../../../components/reader/MobileStoryInfo";
import { getWorkBySlug, getWorksByType } from "../../../lib/content";
import { getContributorMeta } from "../../../lib/content/contributors";
import type {
  BylineCredit,
  CharacterMeta,
  EditorialCredit,
  GlossaryMap,
  StoryInfoData,
  WorkMetaRow
} from "../../../components/reader/types";

export const dynamicParams = false;

export function generateStaticParams() {
  return getWorksByType("cerpen").map((work) => ({ slug: work.slug }));
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

export default async function CerpenWorkPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = getWorkBySlug(slug);
  if (!work || work.type !== "cerpen") {
    notFound();
  }

  const glossary: GlossaryMap = {};
  for (const entry of work.glossary) {
    glossary[entry.term] = { meaning: entry.meaning, source: entry.source };
  }

  const byline: BylineCredit[] = work.credits
    .filter((credit) => credit.byline)
    .map((credit) => {
      const meta = getContributorMeta(credit.slug);
      return {
        name: meta?.name ?? credit.slug,
        maya: meta?.kind === "virtual",
        href: `/penulis/${credit.slug}`
      };
    });

  const workMeta: WorkMetaRow[] = [
    { label: "Bentuk", value: "Cerpen" },
    { label: "Genre", value: work.genre ?? "Keluarga" },
    { label: "Bacaan", value: work.readingMinutes ? `± ${work.readingMinutes} min` : "—" },
    { label: "Status", value: "Karya asli Jalin" },
    { label: "ID", value: work.id },
    { label: "Versi", value: work.version }
  ];

  const characters: CharacterMeta[] = work.metadata?.characters ?? [];

  const editorial: EditorialCredit[] = work.credits.map((credit) => {
    const meta = getContributorMeta(credit.slug);
    const name = meta?.name ?? credit.slug;
    const label = credit.role === "initial_draft"
      ? "Penulis"
      : credit.role === "story_editor"
        ? "Penulis & penyemak"
        : credit.role === "final_editor"
          ? "Editor"
          : credit.role;
    return {
      role: label,
      name: meta?.kind === "virtual" ? `${name} · Maya` : name
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
      <SiteHeader active="cerpen" />

      <main>
        <StoryHead
          kicker={`Cerpen · ${work.genre ?? "Keluarga"}`}
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
        <MobileStoryInfo data={mobileInfo} />
      </main>

      <SiteFooter />
    </>
  );
}