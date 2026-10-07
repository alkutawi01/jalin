import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";

export const metadata: Metadata = {
  title: "Dasar privasi",
  description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.",
  alternates: { canonical: "/privasi" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Dasar privasi", description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.", url: "/privasi", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Dasar privasi", description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.", images: [DEFAULT_SHARE_IMAGE.url] }
};

export default function PrivacyPage() {
  return (
    <InfoPage
      kicker="Dasar"
      title="Dasar privasi"
      intro="Jalin dibina supaya anda boleh membaca tanpa diperhatikan. Inilah yang berlaku, dan tidak berlaku, apabila anda menggunakan laman ini."
      updated="4 Oktober 2026"
    >
      <h2>Yang kami tidak buat</h2>
      <ul>
        <li>Jalin tidak meminta anda membuka akaun atau memberi nama, e-mel atau nombor telefon untuk membaca.</li>
        <li>Jalin tidak menyimpan kuki penjejakan dalam pelayar pembaca.</li>
        <li>Jalin tidak menggunakan perkhidmatan analitik atau iklan pihak ketiga untuk mengikuti apa yang anda baca.</li>
      </ul>

      <h2>Yang berlaku di belakang tabir</h2>
      <p>
        Seperti mana-mana laman web, penyedia hos kami menyimpan rekod teknikal biasa apabila sebuah halaman diminta
        (contohnya alamat IP, jenis pelayar dan masa), untuk menjaga keselamatan dan kestabilan perkhidmatan. Gambar dalam
        karya dihoskan pada storan yang disediakan oleh penyedia yang sama.
      </p>

      <h2>Perubahan</h2>
      <p>
        Jika Jalin kelak menambah ciri yang mengumpul maklumat, seperti akaun pembaca, kami akan mengemas kini
        halaman ini dan menyatakannya dengan jelas sebelum ciri itu digunakan.
      </p>

      <h2>Pertanyaan</h2>
      <p>Jika ada pertanyaan tentang privasi, sila hubungi Adjung Press.</p>
    </InfoPage>
  );
}
