import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { WorkCover } from "../../components/reader/WorkCover";
import { renderAttribution } from "../../components/reader/Attribution";
import CountUp from "../../components/reader/CountUp";
import LoginForm from "../../components/reader/LoginForm";
import StartIcon from "../../components/reader/StartIcons";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { initContentRepository } from "../../lib/content";
import { getDb } from "../../lib/db";
import { displayableGenre } from "../../lib/reader/genre-display";
import { projectPublicWorkSummary, type PublicWorkSummary } from "../../lib/reader/public-projection";
import { computeSiteStats, statItems } from "../../lib/reader/site-stats";
import { readerAccountsEnabled } from "../../lib/reader-auth/enabled";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { sampleSlugs } from "../../lib/reader-auth/switches";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Log masuk dengan emel dan mulakan percubaan percuma 14 hari.";

export const metadata: Metadata = {
  title: "Mula membaca",
  description: DESCRIPTION,
  alternates: { canonical: "/mula" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Mula membaca di Jalin", description: DESCRIPTION, url: "/mula", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Mula membaca di Jalin", description: DESCRIPTION, images: [DEFAULT_SHARE_IMAGE.url] }
};

type Sample = { summary: PublicWorkSummary; href: string };

const hrefOf = (work: { type: string; slug: string; series?: { slug: string } | null }) =>
  work.type === "bersiri" && work.series ? `/kategori/bersiri/${work.series.slug}/${work.slug}` : `/kategori/${work.type}/${work.slug}`;

const REASONS = [
  { icon: "image", title: "Cerita berilustrasi", text: "Setiap cerita datang dengan ilustrasi, bukan sekadar teks." },
  { icon: "device", title: "Baca di mana-mana", text: "Telefon, tablet atau komputer. Satu akaun, sehingga dua peranti." },
  { icon: "key", title: "Tiada kata laluan", text: "Log masuk dengan kod enam digit yang dihantar ke emel anda." },
  { icon: "type", title: "Bacaan ikut selesa anda", text: "Pilih saiz huruf, tema, jarak baris dan lebar teks. Ia diingat pada akaun anda." },
  { icon: "bookmark", title: "Sambung dari tempat berhenti", text: "Senarai Bacaan saya mengingati karya dan bab terakhir anda buka." },
  { icon: "calendar", title: "Tiada pembaharuan automatik", text: "Anda tebus kad apabila mahu. Tiada caj yang datang sendiri." },
];

const STEPS = [
  { icon: "mail", title: "Log masuk dengan emel", text: "Masukkan emel anda dan kami hantar kod enam digit." },
  { icon: "spark", title: "Mulakan percubaan percuma", text: "Baca semua cerita selama 14 hari. Tiada kad dan tiada bayaran." },
  { icon: "card", title: "Teruskan dengan kad langganan", text: "Selepas percubaan, tebus kod daripada kad untuk terus membaca." },
];

const PLANS = [
  { months: 1, price: "RM15", note: "1 bulan" },
  { months: 6, price: "RM30", note: "6 bulan" },
  { months: 12, price: "RM50", note: "12 bulan" },
];

const FAQ = [
  { q: "Apakah itu Jalin?", a: "Jalin ialah laman cerita berilustrasi dalam Bahasa Melayu: cerpen, novela dan cerita bersiri, diterbitkan oleh Adjung Press." },
  { q: "Berapa harga untuk membaca?", a: "14 hari pertama percuma. Selepas itu anda menebus kad langganan: RM15 untuk 1 bulan, RM30 untuk 6 bulan atau RM50 untuk 12 bulan. Kad langganan belum dijual buat masa ini." },
  { q: "Adakah saya perlu memberi butiran kad bank?", a: "Tidak. Jalin tidak menyimpan butiran kad bank dan langganan tidak diperbaharui secara automatik." },
  { q: "Apa yang boleh saya baca tanpa log masuk?", a: "Senarai karya, tajuk dan ringkasan boleh dilihat oleh sesiapa, dan beberapa cerita contoh boleh dibaca penuh tanpa akaun." },
  { q: "Di mana boleh saya membaca?", a: "Pada telefon, tablet dan komputer. Satu akaun boleh log masuk pada sehingga dua peranti serentak." },
  { q: "Bagaimana jika percubaan atau langganan saya tamat?", a: "Anda masih boleh log masuk untuk menguruskan akaun dan menebus kod baharu. Karya penuh dibuka semula sebaik akses aktif." },
  { q: "Bolehkah saya memadam akaun?", a: "Boleh, pada bila-bila masa di halaman Akaun. Pemadaman tidak boleh dipulihkan." },
];

async function loadPage() {
  const repo = await initContentRepository();
  const works = repo.getWorks();
  const stats = statItems(computeSiteStats(works, repo.getPublishedSeries().length));
  // A wall of pictures behind the first screen: the published works' own pictures, a dozen at most.
  const wall = works
    .filter((w) => w.type !== "sinopsis" && w.type !== "fragmen")
    .map((w) => projectPublicWorkSummary(w).hero)
    .filter((h): h is NonNullable<typeof h> => !!h && !!h.src)
    .slice(0, 12);
  const slugs = [...(await sampleSlugs(getDb()))];
  const samples: Sample[] = [];
  for (const slug of slugs.slice(0, 12)) {
    const work = repo.source === "database" ? repo.getWork(slug) : undefined;
    if (!work) continue;
    samples.push({ summary: projectPublicWorkSummary(work), href: hrefOf(work) });
  }
  return { stats, wall, samples };
}

export default async function StartPage() {
  if (!readerAccountsEnabled()) notFound();
  const session = await currentReaderSession();
  const { stats, wall, samples } = await loadPage();

  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <section className="start-hero-band" aria-labelledby="mula-tajuk">
          {wall.length > 0 ? (
            <div className="start-wall" aria-hidden="true">
              {wall.map((h, i) => <img key={h.src + i} src={h.src} alt="" loading={i < 4 ? "eager" : "lazy"} />)}
            </div>
          ) : null}
          <div className="site-shell start-hero-inner">
            <p className="story-kicker">Mula membaca</p>
            <h1 id="mula-tajuk">Selami dunia melalui cerita</h1>
            <p className="dek">Cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Baca semuanya selama 14 hari, tanpa bayaran.</p>
            {session ? (
              <p className="start-actions"><a className="start-button" href="/akaun">Pergi ke akaun saya</a></p>
            ) : (
              <div className="start-signup">
                <p className="start-signup-lead">Sedia membaca? Masukkan emel anda untuk memulakan.</p>
                <LoginForm next="/akaun" compact />
                <p className="start-fine"><a className="start-link" href="/tebus">Saya ada kod langganan</a></p>
              </div>
            )}
          </div>
        </section>

        <div className="site-shell start-page">
          {stats.length > 0 ? (
            <section className="start-stats" aria-label="Isi Jalin">
              <ul>
                {stats.map((item, index) => (
                  <li key={item.key}>
                    <a href={item.href}>
                      <StartIcon name={item.key} size={26} />
                      <span className="start-stat-value"><CountUp value={item.count} delayMs={index * 120} /></span>
                      <span className="start-stat-label">{item.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {samples.length > 0 ? (
            <section className="start-section" aria-labelledby="contoh">
              <h2 id="contoh">Baca dahulu, tanpa log masuk</h2>
              <p className="start-lead">Beberapa cerita terbuka untuk sesiapa sebagai contoh.</p>
              <div className="start-samples">
                {samples.map(({ summary, href }) => {
                  const genre = displayableGenre(summary.genre);
                  const year = (summary.publishedAt ?? "2026").slice(0, 4);
                  const label = summary.type.charAt(0).toUpperCase() + summary.type.slice(1);
                  return (
                    <article className="latest-card" key={href}>
                      <a href={href}>
                        <div className="latest-card-cover">
                          <WorkCover type={summary.type} title={summary.title} hero={summary.hero} rightsYear={year} />
                        </div>
                        <div className="latest-card-body">
                          <div className="latest-card-meta">
                            <span className="latest-card-type">{genre ? `${label} · ${genre}` : label}</span>
                            {summary.readingMinutes ? <span className="latest-card-reading">{`± ${summary.readingMinutes} minit`}</span> : null}
                          </div>
                          <h3 className="latest-card-title" style={{ fontStyle: "normal" }}>{summary.title}</h3>
                          {summary.attribution ? <p className="work-attribution">{renderAttribution(summary.attribution.primary)}</p> : null}
                          {summary.dek ? <p className="latest-card-dek">{summary.dek}</p> : null}
                          <div className="latest-card-footer"><span className="latest-card-cta">Baca →</span></div>
                        </div>
                      </a>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : null}

          <section className="start-section" aria-labelledby="sebab">
            <h2 id="sebab">Sebab untuk membaca di Jalin</h2>
            <ul className="start-reasons">
              {REASONS.map((r) => (
                <li key={r.title}>
                  <span className="start-icon-badge"><StartIcon name={r.icon} /></span>
                  <h3>{r.title}</h3>
                  <p>{r.text}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="start-section" aria-labelledby="langkah">
            <h2 id="langkah">Bagaimana ia berfungsi</h2>
            <ol className="start-steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="start-step-number" aria-hidden="true">{index + 1}</span>
                  <span className="start-icon-badge start-icon-badge--small"><StartIcon name={step.icon} size={20} /></span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="start-section" aria-labelledby="kad">
            <h2 id="kad">Dapatkan kad langganan</h2>
            <p className="start-lead">Selepas percubaan, kad langganan memberi anda akses selama tempoh yang dipilih.</p>
            <ul className="start-plans" aria-label="Pelan kad langganan">
              {PLANS.map((p) => (
                <li key={p.months} className="is-disabled">
                  <span className="start-plan-price">{p.price}</span>
                  <span className="start-plan-note">{p.note}</span>
                </li>
              ))}
            </ul>
            <p className="start-actions">
              <button type="button" className="start-button start-button--disabled" disabled aria-disabled="true">
                <StartIcon name="lock" size={18} />Dapatkan kad langganan
              </button>
            </p>
            <p className="start-fine">Kad langganan akan tersedia tidak lama lagi.</p>
          </section>

          <section className="start-section start-faq" aria-labelledby="soalan">
            <h2 id="soalan">Soalan lazim</h2>
            <div className="start-faq-list">
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="start-section start-closing" aria-label="Mula">
            <a className="start-button" href={session ? "/akaun" : "/log-masuk"}>{session ? "Pergi ke akaun saya" : "Log masuk dan mulakan percubaan"}</a>
            <p className="start-fine">Anda sentiasa boleh log masuk untuk menebus kod atau mengurus akaun, walaupun percubaan sudah tamat.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
