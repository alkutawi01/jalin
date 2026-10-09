import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.",
  alternates: { canonical: "/tentang" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Tentang Kami", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", url: "/tentang", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Tentang Kami", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", images: [DEFAULT_SHARE_IMAGE.url] }
};

export default function AboutPage() {
  return (
    <InfoPage
      kicker="Tentang Kami"
      title="Selami dunia melalui cerita"
      intro="Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu yang mengajak pembaca menyelami dunia melalui cerpen, novela, cerita bersiri, fragmen dan sinopsis."
      active="tentang"
      emblem
    >
      <h2>Apa yang ada di sini</h2>
      <p>
        Setiap cerita di Jalin dibaca di laman ini, tanpa akaun dan tanpa iklan. Ada <a href="/kategori/cerpen">cerpen</a> untuk
        sekali duduk, <a href="/kategori/novela">novela</a> yang dibahagi kepada bab, <a href="/kategori/bersiri">siri</a> yang
        bersambung dari episod ke episod, <a href="/kategori/fragmen">fragmen</a> daripada karya yang kita sayangi, dan{" "}
        <a href="/kategori/sinopsis">sinopsis</a> yang menceritakan semula karya lain dengan suara editorial kami.
      </p>

      <h2>Siapa di sebalik cerita</h2>
      <p>
        Jalin diterbitkan oleh Adjung Press. Setiap cerita menyatakan dengan jelas siapa yang menulis, menyunting dan
        membantu. Sebahagian penulis kami ialah penulis maya, iaitu watak penulis yang dibantu kecerdasan buatan.
        Mereka sentiasa bekerja di bawah kawal selia editorial manusia. Kenali pasukan dan cara kami bekerja di halaman{" "}
        <a href="/editorial">Editorial</a>.
      </p>

      <h2>Ilustrasi</h2>
      <p>
        Cerita di Jalin ditemani gambar. Gambar-gambar itu disediakan dan dipilih oleh pasukan editorial untuk
        menemani teks, bukan menggantikannya. Hak cipta ilustrasi dinyatakan pada setiap gambar.
      </p>

      <h2>Sinopsis dan fragmen</h2>
      <p>
        Sinopsis ialah ringkasan, dan fragmen ialah petikan, daripada karya yang sudah diterbitkan di tempat lain. Kedua-duanya
        bukan karya itu sendiri. Jalin menyatakan karya asal, pengarang, penerbit dan edisi yang digunakan dalam bahagian
        "Tentang karya", supaya pembaca boleh menjejaki sumbernya dan membeli atau meminjam karya penuh.
      </p>

      <h2>Mula membaca</h2>
      <p>
        Belum pasti mahu bermula dari mana? Cuba <a href="/kategori/cerpen">sebuah cerpen</a>: selalunya tidak
        memakan masa lebih daripada beberapa minit.
      </p>

      <h2 id="hubungi">Hubungi kami</h2>
      <p>Untuk pertanyaan, pembetulan atau cadangan kerjasama, sila hubungi Adjung Press.</p>
    </InfoPage>
  );
}
