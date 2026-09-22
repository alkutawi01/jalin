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

const rights = "KERUSI DI BERANDA · © ADJUNG 2026 · ILUSTRASI JALIN";

export default function KerusiDiBerandaPage() {
  const work = getWorkBySlug("kerusi-di-beranda");
  if (!work) {
    throw new Error("Work 'kerusi-di-beranda' tidak ditemui");
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
    note: "Panel Bacaan AI belum dipaparkan sehingga format penilaiannya dimuktamadkan."
  };

  const publicStory = work.body;

  const rubberAnchor = "Di hadapan mereka, jalan tanah merah membelah kampung kepada dua. Di sebelah kiri berdiri rumah-rumah baharu berbumbung genting oren; di sebelah kanan terbentang kebun getah yang sudah tiga tahun tidak ditoreh, pokok-pokoknya masih tegak dalam barisan yang semakin dilupakan.";
  const notebookAnchor = "Menjelang senja, Pak Long meminta pen.";

  const [beforeRubber, afterRubber = ""] = publicStory.split(rubberAnchor);
  const [betweenRubberAndNotebook, ending = ""] = afterRubber.split(notebookAnchor);

  const hero = work.visuals.find((visual) => visual.role === "hero");
  const rubberViz = work.visuals.find((visual) => visual.role === "inline-rubber-estate");
  const notebookViz = work.visuals.find((visual) => visual.role === "inline-notebook");

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
            <StoryMarkdown glossary={glossary}>{beforeRubber + rubberAnchor}</StoryMarkdown>

            <EditorialImage
              src={rubberViz?.src ?? ""}
              alt={rubberViz?.alt ?? ""}
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{betweenRubberAndNotebook}</StoryMarkdown>

            <EditorialImage
              src={notebookViz?.src ?? ""}
              alt={notebookViz?.alt ?? ""}
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{notebookAnchor + ending}</StoryMarkdown>
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