import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { accountsPageMetadata, readerAccountsEnabled } from "../../lib/reader-auth/enabled";

/**
 * Soalan lazim: the address printed on the card (jalin.adjung.com/soalanlazim). Like the other account pages it exists only when reader
 * accounts are switched on, so nobody is told about a subscription that cannot be used yet. Every answer here matches what the code does
 * (the trial, how a code is read, how a new period follows the old); nothing is promised that the code or a decision does not give.
 * The wording was checked by ChatGPT (see docs/SOALAN_LAZIM.md).
 */
export function generateMetadata(): Metadata {
  return accountsPageMetadata({
    title: "Soalan lazim",
    description: "Jawapan tentang menebus kod langganan, percubaan percuma dan akaun pembaca Jalin.",
    alternates: { canonical: "/soalanlazim" }
  });
}

type Item = { q: string; a: ReactNode };
type Group = { id: string; label: string; items: Item[] };

const MAIL = "editorial@adjung.com";

const GROUPS: Group[] = [
  {
    id: "tebus",
    label: "Menebus kod",
    items: [
      {
        q: "Bagaimana saya menebus kod langganan?",
        a: (
          <>
            <ol>
              <li>Daftar atau log masuk ke akaun Jalin.</li>
              <li>Pergi ke <a href="/tebus">jalin.adjung.com/tebus</a>.</li>
              <li>Masukkan kod dan nombor siri yang tercetak pada label di kad, kemudian tekan &ldquo;Tebus kod&rdquo;.</li>
            </ol>
            <p>Langganan anda diaktifkan sebaik sahaja penebusan berjaya.</p>
          </>
        )
      },
      {
        q: "Di mana saya boleh jumpa kod dan nombor siri pada kad?",
        a: (
          <p>
            Label pada kad memaparkan nombor siri (contohnya <code>JLN-12B0126-01</code>) dan kod. Kod berada di bawah pelekat kikis; kikis pelekat itu untuk
            melihatnya.
          </p>
        )
      },
      {
        q: "Apakah maksud nombor siri pada kad?",
        a: (
          <>
            <p>Nombor siri seperti <code>JLN-12B0126-01</code> terdiri daripada empat bahagian:</p>
            <ul>
              <li><strong>JLN</strong>: Jalin.</li>
              <li><strong>12B</strong>: tempoh langganan, iaitu 12 bulan (01B untuk 1 bulan, 06B untuk 6 bulan).</li>
              <li><strong>0126</strong>: bulan dan tahun kod dijangka dikeluarkan (Januari 2026).</li>
              <li><strong>01</strong>: nombor siri kad itu.</li>
            </ul>
            <p>Nombor siri ini perlu dimasukkan bersama kod ketika menebus.</p>
          </>
        )
      },
      {
        q: "Bagaimana cara menaip kod?",
        a: (
          <p>
            Huruf besar atau kecil tidak mengapa, dan jarak atau sengkang diabaikan. Huruf O dibaca sebagai 0, manakala huruf I dan L dibaca sebagai 1.
            Kod tidak mengandungi huruf U.
          </p>
        )
      },
      {
        q: "Kod saya ditolak. Apakah yang patut saya lakukan?",
        a: (
          <>
            <p>
              Semak setiap aksara pada kod dan nombor siri dengan teliti. Setiap kod hanya boleh ditebus sekali, jadi kod yang sudah ditebus tidak boleh
              digunakan lagi.
            </p>
            <p>
              Jika kod masih ditolak, hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a> dan nyatakan nombor siri pada kad. Jangan hantar kod
              penuh melalui e-mel.
            </p>
          </>
        )
      }
    ]
  },
  {
    id: "langganan",
    label: "Langganan dan tempoh",
    items: [
      {
        q: "Bilakah langganan saya bermula dan tamat?",
        a: (
          <>
            <p>Jika anda belum mempunyai akses, langganan bermula serta-merta.</p>
            <p>
              Jika anda masih mempunyai percubaan percuma atau langganan yang aktif, tempoh baharu bersambung selepas akses semasa tamat, jadi tiada hari
              yang hilang. Tempoh langganan (1, 6 atau 12 bulan) tertera pada kad.
            </p>
          </>
        )
      },
      {
        q: "Apakah percubaan percuma?",
        a: <p>Pembaca baharu boleh memulakan percubaan percuma selama 14 hari. Percubaan ini diberi sekali bagi setiap alamat e-mel.</p>
      },
      {
        q: "Bolehkah satu kad digunakan oleh beberapa orang?",
        a: <p>Tidak boleh. Satu kod hanya boleh ditebus oleh satu akaun pembaca, dan satu kad memberi akses kepada seorang pengguna.</p>
      }
    ]
  },
  {
    id: "akaun",
    label: "Akaun dan log masuk",
    items: [
      {
        q: "Saya tidak menerima e-mel kod log masuk.",
        a: (
          <p>
            Jalin tidak menggunakan kata laluan; anda log masuk dengan kod yang dihantar ke e-mel. Semak folder spam atau sampah, pastikan alamat e-mel betul,
            kemudian minta kod baharu. Jika e-mel masih tidak sampai, hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a>.
          </p>
        )
      },
      {
        q: "Siapakah yang boleh membuka akaun?",
        a: (
          <p>
            Akaun hanya boleh dibuka oleh individu berumur 18 tahun ke atas. Kanak-kanak membaca melalui akaun ibu bapa atau penjaga mereka. Lihat juga{" "}
            <a href="/terma">Terma penggunaan</a> dan <a href="/privasi">Dasar privasi</a>.
          </p>
        )
      },
      {
        q: "Bagaimana saya memadam akaun?",
        a: (
          <p>
            Buka halaman Akaun dan pilih &ldquo;Padam akaun&rdquo;. Jika anda masih mempunyai akses yang aktif, anda boleh memilih untuk mengekalkan akaun
            sehingga akses tamat, atau memadamnya sekarang juga.
          </p>
        )
      }
    ]
  },
  {
    id: "kad",
    label: "Kad bermasalah",
    items: [
      {
        q: "Kad saya rosak, hilang atau labelnya tidak dapat dibaca.",
        a: (
          <p>
            Hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a>, nyatakan nombor siri (jika masih ada) dan terangkan masalahnya. Jangan hantar kod penuh
            melalui e-mel.
          </p>
        )
      }
    ]
  }
];

export default function FaqPage() {
  if (!readerAccountsEnabled()) notFound();
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1} className="faq-page">
        <header className="faq-hero">
          <div className="site-shell faq-hero-inner">
            <p className="faq-kicker">Bantuan</p>
            <h1 className="faq-title">Soalan lazim</h1>
            <p className="faq-intro">Jawapan untuk pembaca yang menggunakan kod langganan atau akaun Jalin.</p>
            <nav className="faq-jump" aria-label="Kumpulan soalan">
              {GROUPS.map((g) => <a key={g.id} href={`#${g.id}`}>{g.label}</a>)}
            </nav>
          </div>
        </header>

        <div className="site-shell faq-body">
          {GROUPS.map((group) => (
            <section key={group.id} id={group.id} className="faq-group" aria-labelledby={`${group.id}-h`}>
              <h2 id={`${group.id}-h`} className="faq-group-title">{group.label}</h2>
              {group.items.map((item) => (
                <details key={item.q} className="faq-item">
                  <summary className="faq-q"><span>{item.q}</span><span className="faq-chevron" aria-hidden="true" /></summary>
                  <div className="faq-a">{item.a}</div>
                </details>
              ))}
            </section>
          ))}

          <aside className="faq-contact" aria-labelledby="faq-contact-h">
            <h2 id="faq-contact-h">Masih memerlukan bantuan?</h2>
            <p>Hantar e-mel kepada pasukan Jalin.</p>
            <a className="faq-contact-btn" href={`mailto:${MAIL}`}>{MAIL}</a>
          </aside>
          <p className="faq-updated">Dikemas kini: 24 Oktober 2026</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
