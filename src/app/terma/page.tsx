import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";
import { readerAccountsEnabled } from "../../lib/reader-auth/enabled";

export const metadata: Metadata = {
  title: "Terma penggunaan",
  description: "Cara karya dan ilustrasi di Jalin boleh digunakan.",
  alternates: { canonical: "/terma" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Terma penggunaan", description: "Cara karya dan ilustrasi di Jalin boleh digunakan.", url: "/terma", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Terma penggunaan", description: "Cara karya dan ilustrasi di Jalin boleh digunakan.", images: [DEFAULT_SHARE_IMAGE.url] }
};

function TermsWithoutAccounts() {
  return (
    <InfoPage
      kicker="Dasar"
      title="Terma penggunaan"
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

function TermsWithAccounts() {
  return (
    <InfoPage
      kicker="Dasar"
      title="Terma penggunaan"
      intro="Karya di Jalin ditulis dan dilukis dengan teliti. Terma ini menerangkan cara Jalin digunakan, termasuk akaun, percubaan percuma dan langganan."
      updated="9 Oktober 2026"
    >
      <h2>Akaun</h2>
      <p>
        Akaun dibuka dengan alamat e-mel anda dan satu akaun digunakan oleh seorang pembaca sahaja. Satu akaun boleh log masuk pada
        sehingga dua peranti pada satu masa; untuk menambah peranti ketiga, anda perlu menggantikan salah satu daripada dua itu.
        Anda bertanggungjawab ke atas akses ke e-mel anda dan aktiviti pada akaun anda.
      </p>

      <h2>Percubaan percuma dan langganan</h2>
      <ul>
        <li>Setiap pembaca mendapat percubaan percuma 14 hari, sekali sahaja bagi setiap alamat e-mel, bermula apabila akaun dibuka.</li>
        <li>Selepas itu, akses kepada karya memerlukan langganan: RM15 untuk 1 bulan, RM30 untuk 6 bulan atau RM50 untuk 12 bulan, diaktifkan dengan menebus kad atau kod langganan di halaman Tebus kod.</li>
        <li>Langganan tidak diperbaharui secara automatik dan Jalin tidak menyimpan butiran kad bank anda. Apabila tempoh tamat, anda boleh menebus kad atau kod yang baharu.</li>
        <li>Kad atau kod yang ditebus semasa anda masih mempunyai akses akan bermula selepas akses sedia ada tamat, supaya tiada tempoh yang hilang.</li>
        <li>Setiap kad hanya boleh ditebus sekali. Kod kongsi mempunyai had penggunaan dan tarikh luput, dan hanya sekali bagi setiap akaun.</li>
        <li>
          Jalin boleh menggantung atau membatalkan akses yang diperoleh melalui penipuan, penggunaan kod tanpa kebenaran atau
          pelanggaran material terma ini. Jika pembatalan melibatkan akses berbayar, anda boleh menghubungi Adjung Press untuk semakan.
          Jika kami sendiri tersilap memberi akses, kami akan menyelesaikannya tanpa merugikan anda.
        </li>
      </ul>

      <h2>Kad dan pembelian</h2>
      <ul>
        <li>Kad atau kod bukan wang tunai dan tidak ditukar dengan wang tunai, tanpa menjejaskan hak anda di bawah undang-undang pengguna yang terpakai.</li>
        <li>Jika kad hilang, rosak, atau kod tidak dapat ditebus, hubungi Adjung Press. Setiap kes disemak berdasarkan bukti pembelian dan status kod; kad fizikal yang hilang tidak semestinya boleh diganti.</li>
        <li>Kad yang dibeli melalui pihak ketiga (contohnya kedai dalam talian) tertakluk kepada syarat penjual itu, termasuk untuk pesanan dan penghantaran; hubungi penjual bagi isu tersebut.</li>
      </ul>

      <h2>Membaca</h2>
      <p>Akses anda adalah untuk bacaan peribadi anda sendiri. Berkongsi kod log masuk atau akaun dengan orang lain tidak dibenarkan.</p>

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

      <h2>Menggantung atau menamatkan akaun</h2>
      <p>
        Kami boleh menggantung atau menamatkan akaun yang menyalahgunakan Jalin, contohnya dengan cuba meneka kod, menggunakan
        kad yang dibatalkan, atau mengelak had percubaan percuma. Anda boleh berhenti menggunakan akaun pada bila-bila masa dan
        meminta ia dipadam (lihat Dasar privasi).
      </p>

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

export default function TermsPage() {
  return readerAccountsEnabled() ? <TermsWithAccounts /> : <TermsWithoutAccounts />;
}
