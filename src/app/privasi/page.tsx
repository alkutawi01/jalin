import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";
import { readerAccountsEnabled } from "../../lib/reader-auth/enabled";

export const metadata: Metadata = {
  title: "Dasar privasi",
  description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.",
  alternates: { canonical: "/privasi" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Dasar privasi", description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.", url: "/privasi", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Dasar privasi", description: "Apa yang Jalin kumpul dan tidak kumpul tentang pembaca.", images: [DEFAULT_SHARE_IMAGE.url] }
};

function PrivacyWithoutAccounts() {
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

function PrivacyWithAccounts() {
  return (
    <InfoPage
      kicker="Dasar"
      title="Dasar privasi"
      intro="Halaman awam dan karya contoh Jalin boleh dibaca tanpa akaun. Membaca karya penuh memerlukan akaun. Inilah maklumat yang kami simpan jika anda membukanya, dan mengapa."
      updated="10 Oktober 2026"
    >
      <h2>Tanpa akaun</h2>
      <ul>
        <li>Anda boleh melihat halaman awam Jalin (senarai karya, tajuk dan ringkasan) dan membaca karya contoh tanpa memberi nama, e-mel atau nombor telefon.</li>
        <li>Jalin tidak menggunakan kuki penjejakan, analitik atau iklan pihak ketiga untuk mengikuti apa yang anda baca.</li>
      </ul>

      <h2>Siapa kami</h2>
      <p>
        Jalin dikendalikan oleh Adjung Press, yang menentukan bagaimana data akaun anda diproses. Untuk sebarang perkara tentang data
        anda, hubungi Adjung Press.
      </p>

      <h2>Jika anda membuka akaun</h2>
      <p>
        Akaun dibuka dengan alamat e-mel, yang wajib; tanpanya akaun tidak dapat dibuka. Kami menghantar kod enam digit ke e-mel itu
        dan tiada kata laluan. Kami menyimpan data berikut, dan hanya untuk menyediakan akaun, bacaan dan langganan anda serta menjaga
        keselamatan Jalin:
      </p>
      <ul>
        <li>alamat e-mel anda, untuk menghantar kod log masuk dan mengenali akaun anda;</li>
        <li>nama paparan, jika anda memilih untuk memberinya (tidak wajib);</li>
        <li>peranti yang sedang log masuk (nama peranti yang anda atau pelayar anda beri, dan bila ia terakhir digunakan); satu akaun boleh mempunyai sehingga dua peranti;</li>
        <li>tetapan bacaan anda (saiz huruf, tema, jenis huruf, jarak baris, lebar teks dan redup), serta senarai karya dan bab terakhir yang direkodkan pada halaman Bacaan saya, supaya anda boleh menyambung bacaan (anda boleh mengosongkannya sendiri);</li>
        <li>rekod akses anda: bila percubaan percuma bermula, kod atau kad yang anda tebus, dan tempoh langganan anda.</li>
      </ul>
      <p>
        Untuk menghalang penyalahgunaan (contohnya percubaan meneka kod, atau membuka akaun berulang kali untuk mendapat percubaan
        percuma), kami menyimpan nilai cincang berkunci bagi e-mel dan alamat IP, bukan e-mel atau alamat IP itu sendiri. Nilai ini
        masih kami layan sebagai data peribadi. Kiraan percubaan dipadam secara berkala, biasanya dalam masa beberapa hari, tetapi
        nilai cincang e-mel yang pernah menerima percubaan percuma dikekalkan, juga selepas akaun dipadam, supaya percubaan itu tidak
        dapat dituntut berulang kali. Nilai ini bukan alamat e-mel dalam bentuk biasa, tetapi masih berfungsi sebagai pengecam bagi
        tujuan itu; ia tidak digunakan untuk pemasaran atau pemprofilan pembaca. Percubaan percuma diberi sekali bagi setiap alamat e-mel,
        dan memadam akaun lalu mendaftar semula tidak menetapkan semula kelayakan itu.
      </p>
      <p>
        Data akaun disimpan selagi akaun anda wujud. Rekod sistem yang bersifat sementara (kod log masuk dan kiraan percubaan) dipadam
        dalam masa beberapa hari.
      </p>

      <h2>Kuki</h2>
      <p>
        Selepas anda log masuk, Jalin menyimpan satu kuki fungsi dalam pelayar anda supaya anda kekal log masuk. Ia tidak digunakan
        untuk penjejakan atau iklan. Jika anda log keluar atau memadam kuki itu, anda perlu log masuk semula.
      </p>

      <h2>Kad dan kod langganan</h2>
      <p>
        Kod kad yang dicetak tidak disimpan dalam bentuk boleh dibaca; kami hanya menyimpan nilai cincang berkunci supaya kod itu
        dapat disahkan dan tidak boleh digunakan dua kali. Rekod penebusan dikaitkan dengan akaun yang menebusnya. Kad boleh juga
        dibeli melalui pihak ketiga (contohnya kedai dalam talian); pembelian itu tertakluk kepada dasar pihak tersebut.
      </p>

      <h2>Siapa yang memproses data anda</h2>
      <ul>
        <li>Penyedia hos dan pangkalan data Jalin menyimpan data akaun dan rekod teknikal biasa (alamat IP, jenis pelayar, masa) untuk keselamatan dan kestabilan. Pangkalan data berada di Singapura.</li>
        <li>Perkhidmatan e-mel menghantar kod log masuk kepada anda; ia menerima alamat e-mel anda dan kandungan e-mel itu untuk tujuan penghantaran.</li>
      </ul>
      <p>
        Pembekal ini mungkin memproses data di luar Malaysia, termasuk di Singapura dan negara lain tempat mereka beroperasi. Kami
        hanya menggunakan pembekal bagi menjalankan Jalin dan mengambil langkah munasabah supaya data anda dilindungi. Kami tidak
        menjual data anda dan tidak memberinya kepada pengiklan.
      </p>

      <h2>Hak anda: semak, betulkan dan padam</h2>
      <p>
        Anda boleh memadam akaun anda sendiri pada bila-bila masa di halaman Akaun (butang Padam akaun). Pemadaman akaun adalah muktamad
        dan akaun yang dipadam tidak boleh dipulihkan; baki percubaan atau langganan hilang bersamanya (lihat Terma penggunaan). Untuk
        meminta salinan data akaun anda atau pembetulan, hubungi Adjung Press daripada alamat e-mel akaun itu supaya kami dapat
        mengesahkan ia akaun anda. Jika anda tidak lagi mempunyai akses kepada e-mel itu, hubungi kami juga; kami akan meminta maklumat
        lain untuk mengesahkan identiti anda. Permintaan ini dikendalikan oleh seorang manusia.
      </p>
      <p>
        Apabila akaun dipadam, akses ke akaun itu ditamatkan serta-merta, semua peranti dilog keluar, dan alamat e-mel, nama paparan,
        tetapan bacaan serta senarai Bacaan saya dipadam daripada rekod aktif. Salinan sandaran pangkalan data dilupuskan mengikut
        kitaran sandaran dan tidak dipadam serta-merta. Rekod status penebusan kad boleh dikekalkan tanpa kaitan kepada identiti anda bagi mengelakkan penebusan
        berulang. Rekod lain yang perlu disimpan untuk mematuhi undang-undang, menyelesaikan pertikaian atau mempertahankan tuntutan
        dikekalkan hanya selama diperlukan.
      </p>

      <h2>Kanak-kanak</h2>
      <p>Jalin tidak ditujukan kepada kanak-kanak untuk membuka akaun sendiri. Jika anda ibu bapa atau penjaga dan mendapati anak anda membuka akaun, hubungi Adjung Press.</p>

      <h2>Perubahan</h2>
      <p>Jika dasar ini berubah, kami akan mengemas kini halaman ini dan tarikh di atasnya.</p>

      <h2>Pertanyaan</h2>
      <p>Jika ada pertanyaan tentang privasi, sila hubungi Adjung Press.</p>
    </InfoPage>
  );
}

export default function PrivacyPage() {
  return readerAccountsEnabled() ? <PrivacyWithAccounts /> : <PrivacyWithoutAccounts />;
}
