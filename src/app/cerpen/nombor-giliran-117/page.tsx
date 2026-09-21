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
import type {
  BylineCredit,
  CharacterMeta,
  EditorialCredit,
  GlossaryMap,
  StoryInfoData,
  WorkMetaRow
} from "../../../components/reader/types";

const hero = "https://pikaso.cdnpk.net/private/production/5508775655/render.png?token=exp=1790294400~hmac=edf32d50f9b9bd85575d5cdcab4f16e2550c5134cac333d5302fb1857b58149c";
const title = "Nombor Giliran 117";
const rights = "NOMBOR GILIRAN 117 · © ADJUNG 2026 · ILUSTRASI JALIN";

const glossary: GlossaryMap = {
  "kehilangan pendengaran sensorineural": {
    meaning: "kehilangan pendengaran yang berpunca daripada masalah pada telinga dalam atau laluan saraf pendengaran.",
    source: "Glosari editorial Jalin"
  },
  "alat bantu dengar": {
    meaning: "alat elektronik kecil yang membantu menguatkan bunyi untuk orang yang mengalami kehilangan pendengaran.",
    source: "Glosari editorial Jalin"
  },
  "bahasa isyarat": {
    meaning: "bahasa visual yang menggunakan bentuk dan pergerakan tangan, ekspresi serta ruang untuk berkomunikasi.",
    source: "Glosari editorial Jalin"
  },
  "pereka antara muka": {
    meaning: "orang yang mereka bentuk paparan dan cara pengguna berinteraksi dengan aplikasi atau sistem digital.",
    source: "Glosari editorial Jalin"
  }
};

const byline: BylineCredit[] = [
  { name: "Nara Zahin", maya: true },
  { name: "Rafiq Naim", maya: true }
];

const workMeta: WorkMetaRow[] = [
  { label: "Bentuk", value: "Cerpen" },
  { label: "Genre", value: "Keluarga" },
  { label: "Bacaan", value: "± 11 min" },
  { label: "Status", value: "Karya asli Jalin" },
  { label: "ID", value: "JLN-CER-0002" },
  { label: "Versi", value: "v1.0" }
];

const characters: CharacterMeta[] = [
  { name: "Rohani", role: "Ibu" },
  { name: "Danish", role: "Anak" },
  { name: "Azman", role: "Suami Rohani" }
];

const editorial: EditorialCredit[] = [
  { role: "Penulis", name: "Nara Zahin · Maya" },
  { role: "Penulis & penyemak", name: "Rafiq Naim · Maya" },
  { role: "Editor", name: "Izzat Anas" }
];

const mobileInfo: StoryInfoData = {
  work: workMeta,
  characters,
  editorial,
  note: "Penulis Maya bekerja di bawah kawal selia editorial manusia."
};

export default function NomborGiliran117Page() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content/drafts/nombor-giliran-117.md"),
    "utf8"
  );
  const parsed = matter(raw);
  const internalNotesIndex = parsed.content.indexOf("## Nota editorial dalaman");
  const publicStory = (internalNotesIndex >= 0
    ? parsed.content.slice(0, internalNotesIndex)
    : parsed.content
  ).replace(/\n---\s*$/, "").trim();

  return (
    <>
      <SiteHeader active="cerpen" />

      <main>
        <StoryHead
          kicker="Cerpen · Keluarga"
          title={title}
          dek="Seorang ibu menunggu nombor gilirannya dipanggil, sambil mengingati tahun-tahun ketika dialah yang tidak pernah berhenti menunggu untuk anaknya."
          byline={byline}
        />

        <div className="site-shell">
          <EditorialImage
            kind="hero"
            src={hero}
            alt="Seorang wanita Melayu berusia duduk di kerusi menunggu hospital sambil memegang nombor giliran; wajahnya tidak kelihatan jelas."
            rights={rights}
          />
        </div>

        <div className="site-shell reading-grid">
          <LeftRail
            rows={workMeta}
            note="Penulis Maya bekerja di bawah kawal selia editorial manusia."
          />

          <article className="story-body">
            <StoryMarkdown glossary={glossary}>{publicStory}</StoryMarkdown>
          </article>

          <RightRail characters={characters} editorial={editorial} />
        </div>

        <StoryEnd title={title} />
        <MobileStoryInfo data={mobileInfo} />
      </main>

      <SiteFooter />
    </>
  );
}
