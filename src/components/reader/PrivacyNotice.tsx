import { InfoPage } from "./InfoPage";

const CONTACT = "editorial@adjung.com";

/**
 * The privacy notice for the account era, in Bahasa Malaysia and English on one page (PDPA 2010 section 7 asks for both).
 * The same facts in both languages: change them together. Contact is the editorial address published on Tentang Kami.
 */
export default function PrivacyNotice() {
  return (
    <InfoPage
      kicker="Dasar · Policy"
      title="Dasar privasi"
      intro="Halaman awam dan karya contoh Jalin boleh dibaca tanpa akaun. Membaca karya penuh memerlukan akaun. Inilah maklumat yang kami simpan jika anda membukanya, dan mengapa. English version below."
      updated="10 Oktober 2026"
    >
      <p><a href="#english">Read this notice in English</a></p>

      <h2>Siapa kami</h2>
      <p>
        Jalin dikendalikan oleh Adjung Press, yang menentukan bagaimana data peribadi anda diproses (pengawal data). Untuk sebarang perkara tentang
        data anda, e-mel <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Tanpa akaun</h2>
      <ul>
        <li>Anda boleh melihat halaman awam Jalin (halaman pengenalan, Editorial, Tentang Kami) dan membaca karya contoh tanpa memberi nama, e-mel atau nombor telefon.</li>
        <li>Jalin tidak menggunakan kuki penjejakan, analitik atau iklan pihak ketiga untuk mengikuti apa yang anda baca.</li>
      </ul>

      <h2>Data yang kami simpan jika anda membuka akaun, dan tujuannya</h2>
      <ul>
        <li><strong>Alamat e-mel anda</strong> (wajib): untuk menghantar kod log masuk dan mengenali akaun anda. Tanpanya akaun tidak dapat dibuka.</li>
        <li><strong>Nama paparan</strong> (pilihan): untuk dipaparkan pada akaun anda. Anda boleh tidak memberinya.</li>
        <li><strong>Peranti yang log masuk</strong> (nama peranti yang anda atau pelayar anda beri, dan bila ia terakhir digunakan; sehingga dua peranti bagi satu akaun): untuk menjaga keselamatan akaun dan menguatkuasakan had peranti.</li>
        <li><strong>Tetapan bacaan</strong> (saiz huruf, tema, jenis huruf, jarak baris, lebar teks, redup): supaya bacaan anda sama pada setiap peranti.</li>
        <li><strong>Bacaan saya dan Disimpan</strong> (karya dan bab terakhir yang anda buka, serta karya yang anda simpan): supaya anda boleh menyambung bacaan. Anda boleh mengosongkan senarai itu sendiri.</li>
        <li><strong>Rekod akses</strong> (bila percubaan percuma bermula, kod atau kad yang anda tebus, tempoh langganan): untuk memberi anda akses membaca dan mengelakkan satu kod ditebus dua kali.</li>
        <li><strong>Data keselamatan</strong>: nilai cincang kriptografi berkunci yang dihasilkan daripada e-mel dan alamat IP (bukan e-mel atau alamat IP yang boleh dibaca), untuk menghalang penyalahgunaan seperti meneka kod, menguatkuasakan kelayakan percubaan dan melindungi keselamatan log masuk. Nilai ini masih boleh dianggap data peribadi.</li>
      </ul>
      <p>
        Alamat e-mel diperlukan untuk membuka dan menggunakan akaun Jalin. Tanpanya, anda masih boleh melihat halaman awam dan membaca karya contoh, tetapi tidak boleh membaca karya penuh yang memerlukan akaun.
        Nama paparan adalah pilihan. Tetapan bacaan, Bacaan saya dan Disimpan ialah ciri pilihan yang boleh anda urus melalui akaun.
      </p>
      <p>
        Kami mendapat data ini daripada anda sendiri, dan maklumat teknikal biasa daripada pelayar anda (jenis pelayar dan alamat IP) apabila anda menggunakan
        laman ini. Kami hanya menghantar e-mel kod log masuk kepada anda; kami tidak menghantar e-mel pemasaran.
      </p>

      <h2>Berapa lama kami menyimpannya</h2>
      <ul>
        <li>Data akaun disimpan selagi akaun anda wujud, sehingga anda memadamnya.</li>
        <li>Kod log masuk, kiraan had percubaan dan nilai cincang alamat IP bagi had kadar bersifat sementara dan dipadam dalam masa dua hari.</li>
        <li>Apabila anda memadam akaun, akses ke akaun itu ditamatkan serta-merta dan semua peranti dilog keluar. Alamat e-mel, nama paparan, tetapan bacaan, senarai Bacaan saya dan karya yang disimpan dibuang daripada rekod akaun aktif. Salinan sandaran dilupuskan mengikut kitaran penyimpanan sandaran penyedia perkhidmatan dan mungkin tidak terpadam serta-merta.</li>
        <li>Jika anda pernah menggunakan percubaan percuma, kami mengekalkan nilai cincang berkunci yang dihasilkan daripada alamat e-mel anda selepas akaun dipadam, semata-mata untuk mengelakkan alamat e-mel yang sama menerima percubaan kali kedua. Kami tidak menyimpan alamat e-mel dalam bentuk boleh dibaca bagi tujuan ini, tetapi nilai itu masih berfungsi sebagai pengecam. Ia dikekalkan selagi percubaan percuma ditawarkan, tertakluk pada semakan berkala tentang keperluan menyimpannya, dan tidak digunakan untuk pemasaran atau pemprofilan.</li>
        <li>Selepas akaun dipadam, rekod penebusan kad boleh dikekalkan tanpa pautan langsung kepada akaun yang telah dipadam, bagi mengelakkan penebusan berulang dan mengekalkan rekod penebusan, hanya selama diperlukan untuk tujuan itu. Rekod lain yang perlu disimpan untuk mematuhi undang-undang, menyelesaikan pertikaian atau mempertahankan tuntutan dikekalkan hanya selama diperlukan.</li>
      </ul>

      <h2>Siapa yang menerima data anda</h2>
      <ul>
        <li>Penyedia hos dan penghantaran laman (Vercel) memproses permintaan teknikal biasa (alamat IP, jenis pelayar, masa) untuk keselamatan dan kestabilan.</li>
        <li>Penyedia pangkalan data (Neon) menyimpan data akaun anda. Pangkalan data berada di Singapura.</li>
        <li>Penyedia penghantaran e-mel (Resend) menerima alamat e-mel anda dan kandungan e-mel kod log masuk untuk tujuan penghantaran.</li>
        <li>Pihak berkuasa, jika dikehendaki oleh undang-undang.</li>
      </ul>
      <p>
        Penyedia ini memproses data bagi pihak kami dan hanya bagi menjalankan Jalin. Data peribadi mungkin dipindahkan atau diakses di luar Malaysia, termasuk di
        Singapura dan negara lain tempat penyedia beroperasi, tertakluk pada keperluan undang-undang dan langkah perlindungan yang bersesuaian. Kami tidak menjual data anda dan tidak
        memberinya kepada pengiklan.
      </p>

      <h2>Kuki</h2>
      <p>
        Selepas anda log masuk, Jalin menyimpan satu kuki fungsi dalam pelayar anda supaya anda kekal log masuk. Ia tidak digunakan untuk penjejakan atau iklan.
        Jika anda log keluar atau memadam kuki itu, anda perlu log masuk semula.
      </p>

      <h2>Kad dan kod langganan</h2>
      <p>
        Kod pada kad yang dicetak tidak disimpan dalam bentuk boleh dibaca; kami hanya menyimpan nilai cincang berkunci supaya kod itu dapat disahkan dan tidak boleh
        digunakan dua kali. Rekod penebusan dikaitkan dengan akaun yang menebusnya. Kad yang dibeli melalui pihak ketiga (contohnya kedai dalam talian) tertakluk
        kepada dasar pihak tersebut.
      </p>

      <h2>Hak dan pilihan anda</h2>
      <ul>
        <li><strong>Akses dan kemudahalihan:</strong> anda boleh memuat turun salinan data akaun yang tersedia dalam format JSON pada halaman Akaun (Muat turun data saya). Anda juga boleh memohon akses, pembetulan atau pemindahan data peribadi dengan menghubungi <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Permintaan untuk memindahkan data kepada pengawal data lain tertakluk pada keperluan undang-undang dan kebolehlaksanaan teknikal.</li>
        <li><strong>Pembetulan:</strong> ubah nama paparan pada halaman Akaun. Untuk pembetulan lain, e-mel <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</li>
        <li><strong>Pemadaman:</strong> padam akaun anda sendiri pada bila-bila masa di halaman Akaun. Pemadaman adalah muktamad; baki percubaan atau langganan hilang bersamanya (lihat Terma penggunaan).</li>
        <li><strong>Mengehadkan pemprosesan:</strong> anda boleh memilih untuk tidak memberi nama paparan, mengosongkan senarai Bacaan saya dan mengurus tetapan bacaan. Anda juga boleh menghubungi kami untuk meminta supaya pemprosesan dihadkan, termasuk menarik balik persetujuan apabila pemprosesan bergantung pada persetujuan itu. Permintaan disemak mengikut undang-undang yang terpakai; sesetengah pemprosesan diperlukan untuk mengendalikan akaun, menjaga keselamatannya dan mengurus akses membaca.</li>
        <li><strong>Permintaan melalui e-mel:</strong> hubungi <a href={`mailto:${CONTACT}`}>{CONTACT}</a> daripada alamat e-mel akaun itu supaya kami dapat mengesahkan ia akaun anda. Jika anda tidak lagi mempunyai akses kepada e-mel itu, hubungi kami juga; kami akan meminta maklumat lain untuk mengesahkan identiti anda. Permintaan ini dikendalikan oleh seorang manusia.</li>
        <li><strong>Aduan:</strong> jika anda tidak berpuas hati, hubungi kami dahulu. Anda juga berhak mengadu kepada Pesuruhjaya Perlindungan Data Peribadi Malaysia.</li>
      </ul>

      <h2>Keselamatan</h2>
      <p>
        Log masuk menggunakan kod enam digit yang sah lima minit dan hanya sekali. Kami menyimpan nilai cincang berkunci, bukan kod itu, dan menghadkan percubaan.
        Akses kepada data pembaca dihadkan kepada pemilik Jalin. Jika berlaku pelanggaran data peribadi, kami akan menilai kejadian itu dan memaklumkan Pesuruhjaya Perlindungan
        Data Peribadi serta individu yang terjejas apabila diwajibkan oleh undang-undang.
      </p>

      <h2>Kanak-kanak</h2>
      <p>Jalin tidak ditujukan kepada kanak-kanak untuk membuka akaun sendiri. Jika anda ibu bapa atau penjaga dan mendapati anak anda membuka akaun, hubungi kami.</p>

      <h2>Perubahan</h2>
      <p>Jika dasar ini berubah, kami akan mengemas kini halaman ini dan tarikh di atasnya.</p>

      <hr />

      <section id="english" lang="en">
        <h1>Privacy policy</h1>
        <p>
          The public pages and sample works of Jalin can be read without an account. Reading full works needs an account. This is what we keep if you open
          one, and why.
        </p>
        <p><a href="#kandungan">Baca dalam Bahasa Melayu</a></p>

        <h2>Who we are</h2>
        <p>
          Jalin is run by Adjung Press, which decides how your personal data is processed (the data controller). For anything about your data, e-mail{" "}
          <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
        </p>

        <h2>Without an account</h2>
        <ul>
          <li>You can view Jalin&apos;s public pages (introduction, Editorial, About) and read the sample works without giving a name, e-mail or phone number.</li>
          <li>Jalin does not use tracking cookies, analytics or third-party advertising to follow what you read.</li>
        </ul>

        <h2>What we keep if you open an account, and why</h2>
        <ul>
          <li><strong>Your e-mail address</strong> (required): to send your sign-in code and recognise your account. Without it an account cannot be opened.</li>
          <li><strong>Display name</strong> (optional): to show on your account. You may leave it out.</li>
          <li><strong>Signed-in devices</strong> (the device name you or your browser gives, and when it was last used; up to two devices per account): to keep the account safe and enforce the device limit.</li>
          <li><strong>Reading settings</strong> (text size, theme, typeface, line spacing, text width, dimming): so your reading looks the same on every device.</li>
          <li><strong>My reading and Saved</strong> (the works and chapter you last opened, and the works you saved): so you can pick up where you stopped. You can clear the list yourself.</li>
          <li><strong>Access records</strong> (when a trial started, the codes or cards you redeemed, your subscription period): to give you reading access and to stop a code being redeemed twice.</li>
          <li><strong>Security data</strong>: keyed cryptographic hashes derived from your e-mail and IP address (not the readable e-mail or IP address), to prevent abuse such as guessing codes, to enforce trial eligibility and to protect sign-in security. These values may still count as personal data.</li>
        </ul>
        <p>
          An e-mail address is required to create and use a Jalin account. Without it you can still view the public pages and read the sample works, but you cannot read full works that
          need an account. A display name is optional. Reading settings, My reading and Saved are optional features you can manage through your account.
        </p>
        <p>
          We get this data from you, plus ordinary technical information from your browser (browser type and IP address) when you use the site. We only send
          you the sign-in code e-mail; we do not send marketing e-mail.
        </p>

        <h2>How long we keep it</h2>
        <ul>
          <li>Account data is kept as long as your account exists, until you delete it.</li>
          <li>Sign-in codes, attempt counters and the hashed IP address used for rate limits are short-lived and are deleted within two days.</li>
          <li>When you delete your account, access to it ends at once and every device is signed out. Your e-mail address, display name, reading settings, My reading list and saved works are removed from the live account records. Backup copies are removed according to the service providers&apos; backup retention cycles and may not disappear immediately.</li>
          <li>If you have used the free trial, we keep a keyed hash derived from your e-mail address after the account is deleted, solely to stop the same e-mail address receiving a second trial. We do not keep the e-mail address in readable form for this purpose, but the value still works as an identifier. It is kept while the free trial is offered, subject to periodic review of whether it is still necessary, and is not used for marketing or profiling.</li>
          <li>After an account is deleted, card redemption records may be kept without a direct link to the deleted account, to prevent duplicate redemption and to keep redemption records, only for as long as needed for those purposes. Other records we must keep to comply with the law, settle disputes or defend claims are kept only as long as needed.</li>
        </ul>

        <h2>Who receives your data</h2>
        <ul>
          <li>The hosting and delivery provider (Vercel) processes ordinary technical requests (IP address, browser type, time) for security and stability.</li>
          <li>The database provider (Neon) stores your account data. The database is in Singapore.</li>
          <li>The e-mail delivery provider (Resend) receives your e-mail address and the content of the sign-in e-mail, for delivery.</li>
          <li>Authorities, where the law requires it.</li>
        </ul>
        <p>
          These providers process data on our behalf, only to run Jalin. Personal data may be transferred or accessed outside Malaysia, including in Singapore and other countries where the
          providers operate, subject to applicable legal requirements and appropriate safeguards. We do not sell your data or give it to advertisers.
        </p>

        <h2>Cookies</h2>
        <p>
          After you sign in, Jalin keeps one functional cookie in your browser so you stay signed in. It is not used for tracking or advertising. If you sign out or
          clear the cookie, you will need to sign in again.
        </p>

        <h2>Cards and subscription codes</h2>
        <p>
          The code on a printed card is not stored in readable form; we keep only a keyed hash so the code can be checked and cannot be used twice. A redemption is
          linked to the account that redeemed it. Cards bought from a third party (for example an online shop) are subject to that party&apos;s policies.
        </p>

        <h2>Your rights and choices</h2>
        <ul>
          <li><strong>Access and portability:</strong> you can download a copy of your available account data in JSON format from the Account page (Download my data). You may also request access to, correction of, or transfer of your personal data by contacting <a href={`mailto:${CONTACT}`}>{CONTACT}</a>. Requests to transfer data to another data controller are subject to applicable legal requirements and technical feasibility.</li>
          <li><strong>Correction:</strong> change your display name on the Account page. For any other correction, e-mail <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</li>
          <li><strong>Deletion:</strong> delete your account yourself at any time on the Account page. Deletion is final and any remaining trial or subscription is lost with it (see the Terms of use).</li>
          <li><strong>Limiting processing:</strong> you may choose not to give a display name, clear your My reading list and manage your reading settings. You may also contact us to ask that processing be limited, including withdrawing consent where processing relies on consent. We review requests under applicable law; some processing is necessary to operate your account, keep it secure and manage reading access.</li>
          <li><strong>Requests by e-mail:</strong> write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the e-mail address of the account so we can confirm it is yours. If you no longer have access to that e-mail, contact us anyway; we will ask for other information to confirm your identity. These requests are handled by a person.</li>
          <li><strong>Complaints:</strong> if you are not satisfied, contact us first. You also have the right to complain to the Personal Data Protection Commissioner of Malaysia.</li>
        </ul>

        <h2>Security</h2>
        <p>
          Sign-in uses a six-digit code that is valid for five minutes and works once. We store keyed hashes, not the code itself, and limit attempts. Access to reader
          data is restricted to Jalin&apos;s owner. If a personal data breach occurs, we will assess it and notify the Personal Data Protection Commissioner and the individuals affected where the law requires.
        </p>

        <h2>Children</h2>
        <p>Jalin is not aimed at children opening accounts of their own. If you are a parent or guardian and find that your child has opened an account, please contact us.</p>

        <h2>Changes</h2>
        <p>If this policy changes, we will update this page and the date at the top.</p>
      </section>
    </InfoPage>
  );
}
