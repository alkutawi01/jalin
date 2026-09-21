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

const visuals = {
  hero: "https://pikaso.cdnpk.net/private/production/5508922841/render.png?token=exp=1790294400~hmac=bb311f6892fa9d26a4927581da7848dcd9d8b15a4eeb5bd12f92964ca0f18931",
  notebook: "https://pikaso.cdnpk.net/private/production/5508950473/render.png?token=exp=1790294400~hmac=eef4dc2e33c283283eac84dfccbccb77352aa3aac20fed7240527cfb749c85b9",
  rubberEstate: "https://pikaso.cdnpk.net/private/production/5508937214/render.png?token=exp=1790294400~hmac=cc4eba50b39aa20a5d58e7e8762e9a447d363c56a8b6dc8e82ab217a4ce748d3"
};

const title = "Kerusi di Beranda";
const rights = "KERUSI DI BERANDA · © ADJUNG 2026 · ILUSTRASI JALIN";

const glossary: GlossaryMap = {
  "kemerosotan kognitif": {
    meaning: "kemerosotan pada keupayaan mental seperti mengingat, memahami atau berfikir.",
    source: "Kamus Dewan / PRPM"
  },
  "diagnosis": {
    meaning: "pengenalpastian sesuatu penyakit berdasarkan tanda dan gejalanya.",
    source: "Kamus Dewan / PRPM"
  },
  "ditoreh": {
    meaning: "digores pada kulit pokok, seperti pokok getah, untuk mendapatkan hasilnya.",
    source: "Kamus Dewan / PRPM"
  },
  "perancah": {
    meaning: "rangka sementara yang dipasang sebagai tempat atau tumpuan semasa kerja binaan.",
    source: "Kamus Dewan / PRPM"
  },
  "penyelia tapak": {
    meaning: "orang yang mengawasi kerja di sesuatu tapak.",
    source: "Kamus Dewan / PRPM"
  },
  "sentimental value": {
    meaning: "nilai perasaan atau kenangan yang melekat pada sesuatu benda.",
    source: "Terjemahan editorial Jalin"
  },
  "saban": {
    meaning: "setiap; berulang pada waktu tertentu.",
    source: "Kamus Dewan / glosari editorial Jalin"
  },
  "sayup": {
    meaning: "samar kerana jauh, khususnya bunyi atau pandangan.",
    source: "Kamus Dewan / glosari editorial Jalin"
  },
  "terlerai": {
    meaning: "terurai atau terbuka daripada ikatan atau susunan.",
    source: "Kamus Dewan / glosari editorial Jalin"
  },
  "tersisa": {
    meaning: "masih berbaki atau tinggal sedikit.",
    source: "Glosari editorial Jalin"
  }
};

const byline: BylineCredit[] = [
  { name: "Nara Zahin", maya: true, href: "/penulis/nara-zahin" },
  { name: "Rafiq Naim", maya: true, href: "/penulis/rafiq-naim" }
];

const workMeta: WorkMetaRow[] = [
  { label: "Bentuk", value: "Cerpen" },
  { label: "Genre", value: "Keluarga" },
  { label: "Bacaan", value: "± 12 min" },
  { label: "Status", value: "Karya asli Jalin" },
  { label: "ID", value: "JLN-CER-0001" },
  { label: "Versi", value: "v0.2" }
];

const characters: CharacterMeta[] = [
  { name: "Pak Long Rashid", role: "Bapa" },
  { name: "Along", role: "Anak" }
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
  note: "Panel Bacaan AI belum dipaparkan sehingga format penilaiannya dimuktamadkan."
};

export default function KerusiDiBerandaPage() {
  const raw = fs.readFileSync(
    path.join(process.cwd(), "content/drafts/kerusi-di-beranda.md"),
    "utf8"
  );
  const parsed = matter(raw);
  const internalNotesIndex = parsed.content.indexOf("## Nota editorial dalaman");
  const publicStory = (internalNotesIndex >= 0
    ? parsed.content.slice(0, internalNotesIndex)
    : parsed.content
  ).replace(/\n---\s*$/, "").trim();

  const rubberAnchor = "Di hadapan mereka, jalan tanah merah membelah kampung kepada dua. Di sebelah kiri berdiri rumah-rumah baharu berbumbung genting oren; di sebelah kanan terbentang kebun getah yang sudah tiga tahun tidak ditoreh, pokok-pokoknya masih tegak dalam barisan yang semakin dilupakan.";
  const notebookAnchor = "Menjelang senja, Pak Long meminta pen.";

  const [beforeRubber, afterRubber = ""] = publicStory.split(rubberAnchor);
  const [betweenRubberAndNotebook, ending = ""] = afterRubber.split(notebookAnchor);

  return (
    <>
      <SiteHeader active="cerpen" />

      <main>
        <StoryHead
          kicker="Cerpen · Keluarga"
          title={title}
          dek="Di sebuah beranda yang menyimpan lebih banyak daripada yang pernah ditanya, seorang anak mula menulis sebelum sebahagian cerita keluarganya hilang."
          byline={byline}
        />

        <div className="site-shell">
          <EditorialImage
            kind="hero"
            src={visuals.hero}
            alt="Kerusi rotan lama di beranda rumah kampung dengan kain lusuh pada tiang kayu."
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
              src={visuals.rubberEstate}
              alt="Barisan pokok getah lama yang tidak ditoreh, dengan semak mula memenuhi lantai kebun."
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{betweenRubberAndNotebook}</StoryMarkdown>

            <EditorialImage
              src={visuals.notebook}
              alt="Tangan tua Pak Long memegang pen di atas buku nota di meja beranda."
              rights={rights}
            />

            <StoryMarkdown glossary={glossary}>{notebookAnchor + ending}</StoryMarkdown>
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
