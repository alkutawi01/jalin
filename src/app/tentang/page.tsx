import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";

export const metadata: Metadata = {
  title: "Tentang Jalin",
  description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.",
  alternates: { canonical: "/tentang" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Tentang Jalin", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", url: "/tentang", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Tentang Jalin", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", images: [DEFAULT_SHARE_IMAGE.url] }
};

export default function AboutPage() {
  return (
    <InfoPage
      kicker="Tentang"
      title="Selami dunia melalui cerita"
      intro="Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu yang mengajak pembaca menyelami dunia melalui cerpen, novela, cerita bersiri, fragmen dan sinopsis."
    >
      <h2>Apa yang ada di sini</h2>
      <p>
        Setiap karya Jalin dibaca di laman ini, tanpa akaun dan tanpa iklan. Ada <a href="/kategori/cerpen">cerpen</a> untuk
        sekali duduk, <a href="/kategori/novela">novela</a> yang dibahagi kepada bab, <a href="/kategori/bersiri">siri</a> yang
        bersambung dari episod ke episod, <a href="/kategori/fragmen">fragmen</a> daripada karya yang kita sayangi, dan{" "}
        <a href="/kategori/sinopsis">sinopsis</a> yang menceritakan semula karya lain dengan suara editorial kami.
      </p>

      <h2>Siapa di sebalik cerita</h2>
      <p>
        Jalin diterbitkan oleh Adjung Press. Setiap karya menyatakan dengan jelas siapa yang menulis, menyunting dan
        membantu. Sebahagian penulis kami ialah penulis maya, iaitu watak penulis yang dibantu kecerdasan buatan.
        Mereka sentiasa bekerja di bawah kawal selia editorial manusia, dan halaman setiap penulis menyatakan dengan jelas siapa dia.
      </p>

      <h2>Ilustrasi</h2>
      <p>
        Cerita di Jalin ditemani gambar. Gambar-gambar itu disediakan dan dipilih oleh pasukan editorial untuk
        menemani teks, bukan menggantikannya. Hak cipta ilustrasi dinyatakan pada setiap gambar.
      </p>

      <h2>Karya daripada sumber lain</h2>
      <p>
        Fragmen dan sinopsis berasal daripada karya yang sudah ada. Jalin menyatakan karya asal, pengarang, penerbit dan
        edisi yang digunakan dalam bahagian "Tentang karya", supaya pembaca boleh menjejaki sumbernya dan membeli atau
        meminjam karya penuh.
      </p>

      <h2>Mula membaca</h2>
      <p>
        Belum pasti mahu bermula dari mana? Cuba <a href="/kategori/cerpen">sebuah cerpen</a>: selalunya tidak
        memakan masa lebih daripada beberapa minit.
      </p>
    </InfoPage>
  );
}
