import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
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
import { getWorkBySlug } from "../../../lib/content";
import type {
  BylineCredit,
  CharacterMeta,
  EditorialCredit,
  GlossaryMap,
  StoryInfoData,
  WorkMetaRow
} from "../../../components/reader/types";

function getContributorMeta(slug: string): { name: string; kind: string } | undefined {
  const contributorPath = path.join(process.cwd(), "content", "contributors", `${slug}.md`);
  if (!fs.existsSync(contributorPath)) return undefined;
  const parsed = matter(fs.readFileSync(contributorPath, "utf8"));
  return {
    name: String(parsed.data.name ?? slug),
    kind: String(parsed.data.kind ?? "human")
  };
}

const rights = "NOMBOR GILIRAN 117 · © ADJUNG 2026 · ILUSTRASI JALIN";

export default function NomborGiliran117Page() {
  const work = getWorkBySlug("nombor-giliran-117");
  if (!work) {
    throw new Error("Work 'nombor-giliran-117' tidak ditemui");
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
    note: "Penulis Maya bekerja di bawah kawal selia editorial manusia."
  };

  const publicStory = work.body;

  const kitchenAnchor = "Begitulah hampir setiap pagi.";
  const hearingAnchor = "Alat bantu dengar itu kekal di atas meja hingga Maghrib.";

  const [throughKitchen, afterKitchen] = splitAfter(publicStory, kitchenAnchor);
  const [throughHearing, afterHearing] = splitAfter(afterKitchen ?? "", hearingAnchor);

  const hero = work.visuals.find((visual) => visual.role === "hero");
  const nasiLemakViz = work.visuals.find((visual) => visual.role === "inline-nasi-lemak");
  const hearingAidsViz = work.visuals.find((visual) => visual.role === "inline-hearing-aids");

  return (
    <>
      <SiteHeader active="cerpen" />

      <main>
        <StoryHead
          kicker="Cerpen · Keluarga"
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
            <StoryMarkdown glossary={glossary}>{throughKitchen}</StoryMarkdown>

            <EditorialImage
              src={nasiLemakViz?.src ?? ""}
              alt={nasiLemakViz?.alt ?? ""}
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{throughHearing}</StoryMarkdown>

            <EditorialImage
              src={hearingAidsViz?.src ?? ""}
              alt={hearingAidsViz?.alt ?? ""}
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{afterHearing}</StoryMarkdown>
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

function splitAfter(text: string, anchor: string): [string, string] {
  const index = text.indexOf(anchor);
  if (index < 0) return [text, ""];
  const end = index + anchor.length;
  return [text.slice(0, end), text.slice(end)];
}