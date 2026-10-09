import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";
import { listVisibleContributors, type ContributorListing } from "../../lib/reader/contributor-index";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Siapa yang menulis, menyunting dan memutuskan di Jalin, dan cara kami menerbitkan, mengkredit dan membetulkan.";

export const metadata: Metadata = {
  title: "Editorial",
  description: DESCRIPTION,
  alternates: { canonical: "/editorial" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Editorial", description: DESCRIPTION, url: "/editorial", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Editorial", description: DESCRIPTION, images: [DEFAULT_SHARE_IMAGE.url] }
};

function People({ people }: { people: ContributorListing[] }) {
  return (
    <ul className="people-list">
      {people.map((person) => (
        <li key={person.slug}>
          <a className="people-name" href={`/penulis/${person.slug}`}>{person.name}</a>
          {person.about ? <span className="people-about">{person.about}</span> : null}
        </li>
      ))}
    </ul>
  );
}

export default async function EditorialPage() {
  let contributors: ContributorListing[] = [];
  try {
    contributors = await listVisibleContributors();
  } catch {
    // The rest of the page is still worth reading when the list cannot be loaded.
  }
  const humans = contributors.filter((person) => person.kind !== "virtual");
  const virtual = contributors.filter((person) => person.kind === "virtual");

  return (
    <InfoPage
      kicker="Editorial"
      title="Siapa di sebalik setiap cerita"
      intro="Jalin menyatakan dengan jelas siapa yang menulis, menyunting dan memutuskan, dan bagaimana sesuatu cerita sampai kepada anda."
      active="editorial"
    >
      {humans.length > 0 ? (
        <>
          <h2>Editor dan pasukan</h2>
          <People people={humans} />
        </>
      ) : null}

      {virtual.length > 0 ? (
        <>
          <h2>Penulis maya</h2>
          <p>
            Sebahagian cerita ditulis atau disemak oleh penulis maya, iaitu watak penulis yang dibantu kecerdasan buatan. Mereka
            bekerja di bawah kawal selia editorial manusia, dan halaman setiap seorang menyatakan dengan jelas siapa dia.
          </p>
          <People people={virtual} />
        </>
      ) : null}

      <h2>Cara kami menerbitkan</h2>
      <ul>
        <li>Tiada apa-apa diterbitkan secara automatik. Setiap cerita disemak dan diluluskan oleh editor manusia sebelum sampai kepada pembaca.</li>
        <li>Kredit mengikut sumbangan sebenar. Penulis, penterjemah, penyunting dan penyemak fakta disebut dengan peranan masing-masing.</li>
        <li>Bagi sinopsis dan fragmen, nama di bawah tajuk ialah pengarang karya asal. Siapa yang menulis semula atau menyemak disebut dalam blok Editorial pada setiap halaman.</li>
        <li>Jika sesuatu cerita mengandungi unsur yang memerlukan konteks, editor menulis Catatan editor di bawahnya.</li>
      </ul>

      <h2>Karya, sinopsis dan fragmen</h2>
      <p>
        Dalam istilah Jalin, <em>karya</em> ialah cerpen, novela dan cerita bersiri. Sinopsis dan fragmen bukan karya: sinopsis ialah
        ringkasan sebuah karya, dan fragmen ialah petikan daripadanya. Kedua-duanya hanya diambil daripada karya yang sudah
        diterbitkan di tempat lain, dengan sumber, pengarang dan hak yang dinyatakan pada bahagian "Tentang karya".
      </p>

      <h2>Ilustrasi</h2>
      <p>
        Gambar dipilih dan diluluskan oleh pasukan editorial untuk menemani teks, bukan menggantikannya. Setiap gambar dipautkan
        pada adegan tertentu dalam cerita, dan wajah manusia tidak dipaparkan dengan jelas.
      </p>

      <h2>Pembetulan dan versi</h2>
      <p>
        Cerita di Jalin ialah teks yang hidup. Setiap cerita menyimpan tarikh terbit, tarikh kemas kini dan versi, dan perubahan
        yang bermakna dicatat dalam sejarah editorial. Jika anda menemui kesilapan, sila maklumkan kepada kami melalui{" "}
        <a href="/tentang#hubungi">halaman Tentang Kami</a>.
      </p>
    </InfoPage>
  );
}
