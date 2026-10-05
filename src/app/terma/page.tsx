import type { Metadata } from "next";
import { InfoPage } from "../../components/reader/InfoPage";

export const metadata: Metadata = {
  title: "Terma Penggunaan",
  description: "Cara karya dan ilustrasi di Jalin boleh digunakan.",
  alternates: { canonical: "/terma" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Terma Penggunaan", description: "Cara karya dan ilustrasi di Jalin boleh digunakan.", url: "/terma", locale: "ms_MY" },
  twitter: { card: "summary_large_image", title: "Terma Penggunaan", description: "Cara karya dan ilustrasi di Jalin boleh digunakan." }
};

export default function TermsPage() {
  return (
    <InfoPage
      kicker="Dasar"
      title="Terma Penggunaan"
      intro="Karya di Jalin ditulis dan dilukis dengan teliti. Terma ringkas ini menerangkan cara ia boleh digunakan."
      updated="4 Oktober 2026"
    >
      <h2>Membaca</h2>
      <p>Anda bebas membaca semua karya di Jalin tanpa bayaran dan tanpa akaun.</p>

      <h2>Hak cipta</h2>
      <p>
        Karya, teks editorial dan ilustrasi di Jalin ialah hak cipta Adjung Press dan penyumbangnya, melainkan
        dinyatakan sebaliknya. Fragmen dan sinopsis menyebut karya asal dan pemegang hak asalnya; hak ke atas karya asal
        itu kekal pada pemiliknya.
      </p>

      <h2>Yang dibenarkan</h2>
      <ul>
        <li>Berkongsi pautan ke mana-mana halaman di Jalin.</li>
        <li>Memetik bahagian pendek untuk ulasan atau perbincangan, dengan menyebut tajuk, pengarang dan Jalin.</li>
      </ul>

      <h2>Yang memerlukan kebenaran</h2>
      <ul>
        <li>Menyalin atau menerbitkan semula karya atau ilustrasi, sama ada sebahagian besar atau keseluruhan.</li>
        <li>Menggunakan karya atau ilustrasi untuk tujuan komersial, termasuk melatih sistem kecerdasan buatan.</li>
      </ul>

      <h2>Tanpa jaminan</h2>
      <p>
        Jalin disediakan sebagaimana adanya. Kami berusaha agar maklumat tepat dan laman sentiasa tersedia, tetapi
        tidak dapat menjaminnya, dan kandungan boleh diubah atau ditarik balik tanpa notis awal.
      </p>

      <h2>Perubahan</h2>
      <p>Terma ini boleh dikemas kini. Tarikh kemas kini terakhir tertera di bawah halaman ini.</p>
    </InfoPage>
  );
}
