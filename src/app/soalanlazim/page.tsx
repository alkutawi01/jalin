import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { accountsPageMetadata, readerAccountsEnabled } from "../../lib/reader-auth/enabled";

/**
 * Soalan lazim: the address printed on the card (jalin.adjung.com/soalanlazim). Like the other account pages it exists only when reader
 * accounts are switched on, so nobody is told about a subscription that cannot be used yet. Every answer here matches what the code does
 * (the trial, how a code is read, how a new period follows the old, the labels of the account page); nothing is promised that the code or
 * a decision does not give: no refund, no replacement card, no reply time.
 * The wording was checked by ChatGPT on 24 Oct 2026 against those facts (docs/SOALAN_LAZIM.md).
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
        q: "Bagaimanakah saya menebus kod langganan?",
        a: (
          <>
            <ol>
              <li>Daftar akaun Jalin atau log masuk jika anda sudah mempunyai akaun.</li>
              <li>Buka <a href="/tebus">jalin.adjung.com/tebus</a>.</li>
              <li>Masukkan nombor siri dan kod langganan pada kad, kemudian tekan &ldquo;Tebus kod&rdquo;.</li>
            </ol>
            <p>
              Selepas penebusan berjaya, langganan bermula serta-merta jika anda belum mempunyai akses. Jika anda masih mempunyai percubaan percuma atau
              langganan aktif, tempoh baharu bermula selepas akses semasa tamat.
            </p>
          </>
        )
      },
      {
        q: "Di manakah saya boleh menemukan nombor siri dan kod pada kad?",
        a: (
          <p>
            Label pada kad memaparkan nombor siri dan kod langganan. Kod berada di bawah pelekat kikis; kikis
            pelekat itu untuk melihatnya.
          </p>
        )
      },
      {
        q: "Bagaimanakah saya perlu memasukkan kod?",
        a: (
          <>
            <p>
              Kod langganan mempunyai 16 aksara dan satu aksara semak di hujungnya. Anda boleh menggunakan huruf besar atau huruf kecil, dan jarak atau
              sengkang akan diabaikan.
            </p>
            <p>Huruf O dianggap sebagai angka 0, manakala huruf I dan L dianggap sebagai angka 1. Kod tidak mengandungi huruf U.</p>
          </>
        )
      },
      {
        q: "Mengapakah kod saya ditolak?",
        a: (
          <>
            <p>
              Semak semula setiap aksara pada kod langganan dan nombor siri pada kad. Pastikan kedua-duanya dimasukkan dengan betul. Setiap kod hanya
              boleh ditebus sekali, jadi kod yang sudah ditebus tidak boleh digunakan lagi.
            </p>
            <p>
              Jika kod masih ditolak, hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a> dan nyatakan nombor siri pada kad. Jangan hantar kod
              langganan penuh melalui e-mel.
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
            <p>
              Jika anda belum mempunyai akses, langganan bermula sebaik sahaja penebusan berjaya. Jika percubaan percuma atau langganan anda masih aktif,
              tempoh baharu bermula selepas akses semasa tamat.
            </p>
            <p>Tempoh langganan ialah 1, 6 atau 12 bulan, seperti yang tertera pada kad.</p>
          </>
        )
      },
      {
        q: "Apakah percubaan percuma?",
        a: <p>Pembaca baharu boleh memulakan percubaan percuma selama 14 hari. Setiap alamat e-mel hanya layak mendapat satu percubaan percuma.</p>
      },
      {
        q: "Bolehkah satu kad digunakan oleh beberapa orang?",
        a: (
          <p>
            Setiap kod langganan hanya boleh ditebus sekali, oleh satu akaun pembaca. Kod yang sudah ditebus tidak boleh ditebus semula oleh akaun lain.
          </p>
        )
      }
    ]
  },
  {
    id: "akaun",
    label: "Akaun dan log masuk",
    items: [
      {
        q: "Bagaimanakah jika saya tidak menerima e-mel kod log masuk?",
        a: (
          <>
            <p>
              Jalin tidak menggunakan kata laluan. Untuk log masuk, masukkan kod enam digit yang dihantar ke e-mel anda. Kod ini berbeza daripada kod
              langganan pada kad.
            </p>
            <p>
              Jika e-mel tidak diterima, semak folder spam atau sampah dan pastikan alamat e-mel betul, kemudian tekan &ldquo;Hantar semula kod&rdquo;.
              Jika masalah berterusan, hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a>.
            </p>
          </>
        )
      },
      {
        q: "Siapakah yang boleh membuka akaun?",
        a: (
          <p>
            Akaun hanya boleh dibuka oleh individu berumur 18 tahun ke atas. Kanak-kanak boleh membaca melalui akaun ibu bapa atau penjaga mereka. Untuk
            maklumat lanjut, sila rujuk <a href="/terma">Terma penggunaan</a> dan <a href="/privasi">Dasar privasi</a>.
          </p>
        )
      },
      {
        q: "Bagaimanakah saya memadam akaun?",
        a: (
          <p>
            Buka halaman Akaun dan pilih &ldquo;Padam akaun&rdquo;. Jika akses anda masih aktif, anda boleh memilih &ldquo;Kekalkan akaun sehingga
            tamat&rdquo; atau &ldquo;Padam sekarang juga&rdquo;.
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
        q: "Apakah yang perlu saya lakukan jika kad rosak, hilang atau maklumat pada kad tidak dapat dibaca?",
        a: (
          <p>
            Hubungi kami di <a href={`mailto:${MAIL}`}>{MAIL}</a>. Nyatakan nombor siri jika masih ada dan terangkan masalah yang dihadapi. Jangan hantar
            kod langganan penuh melalui e-mel.
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
