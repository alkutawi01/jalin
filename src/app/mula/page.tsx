import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { WorkCover } from "../../components/reader/WorkCover";
import { renderAttribution } from "../../components/reader/Attribution";
import HomeStats from "../../components/reader/HomeStats";
import LoginForm from "../../components/reader/LoginForm";
import StartIcon from "../../components/reader/StartIcons";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { initContentRepository } from "../../lib/content";
import { getDb } from "../../lib/db";
import { displayableGenre } from "../../lib/reader/genre-display";
import { projectPublicWorkSummary, type PublicWorkSummary } from "../../lib/reader/public-projection";
import { computeSiteStats, statItems } from "../../lib/reader/site-stats";
import { visibleSampleCount } from "../../lib/reader/sample-count";
import { getWall } from "../../lib/reader/start-wall";
import { readerAccountsEnabled } from "../../lib/reader-auth/enabled";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { sampleSlugs } from "../../lib/reader-auth/switches";
import { homeGrounds } from "../../lib/site-theme";
import { siteOpenForViewer } from "../../lib/reader/access-gate";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Log masuk dengan e-mel dan mulakan percubaan percuma 14 hari.";

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
  { icon: "image", title: "Cerita berilustrasi", text: "Setiap cerita disertai ilustrasi yang menghidupkan suasana." },
  { icon: "device", title: "Baca di pelbagai peranti", text: "Telefon, tablet atau komputer. Satu akaun untuk sehingga dua peranti." },
  { icon: "key", title: "Tanpa kata laluan", text: "Log masuk dengan kod enam digit yang dihantar ke e-mel anda." },
  { icon: "type", title: "Laraskan bacaan anda", text: "Pilih saiz dan jenis huruf, tema, jarak baris, lebar teks serta tahap redup. Tetapan ini disimpan dalam akaun anda." },
  { icon: "bookmark", title: "Sambung membaca dengan mudah", text: "Bacaan saya menyimpan senarai karya dan bab terakhir yang anda buka." },
  { icon: "calendar", title: "Tiada pembaharuan automatik", text: "Langganan tamat apabila tempohnya berakhir. Tebus kod daripada kad baharu hanya apabila mahu meneruskan bacaan." },
];

const STEPS = [
  { title: "Log masuk dengan e-mel", text: "Masukkan e-mel anda dan kami hantar kod enam digit." },
  { title: "Mulakan percubaan percuma", text: "Selepas log masuk, aktifkan percubaan apabila anda bersedia. Baca semua cerita selama 14 hari tanpa bayaran." },
  { title: "Teruskan dengan kad langganan", text: "Selepas percubaan tamat, tebus kod daripada kad langganan untuk terus membaca." }
];

const PLANS = [
  { months: 1, price: "RM15", note: "1 bulan" },
  { months: 6, price: "RM30", note: "6 bulan" },
  { months: 12, price: "RM50", note: "12 bulan" },
];

const FAQ = [
  { q: "Apakah itu Jalin?", a: "Jalin ialah laman cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu, terbitan Adjung Press." },
  { q: "Berapa harga untuk membaca?", a: "Percubaan percuma selama 14 hari bermula apabila anda mengaktifkannya selepas log masuk. Selepas itu, kad langganan berharga RM15 untuk 1 bulan, RM30 untuk 6 bulan atau RM50 untuk 12 bulan. Kad langganan belum dijual buat masa ini." },
  { q: "Adakah Jalin menyimpan butiran kad bank?", a: "Tidak. Jalin tidak menyimpan butiran kad bank dan langganan tidak diperbaharui secara automatik." },
  { q: "Apa yang boleh saya baca tanpa log masuk?", a: "Senarai karya, tajuk dan ringkasan boleh dilihat oleh sesiapa, dan beberapa cerita contoh boleh dibaca penuh tanpa akaun." },
  { q: "Di mana boleh saya membaca?", a: "Anda boleh membaca melalui telefon, tablet atau komputer. Satu akaun boleh digunakan pada sehingga dua peranti." },
  { q: "Bagaimana jika percubaan atau langganan saya tamat?", a: "Anda masih boleh log masuk untuk mengurus akaun dan menebus kod langganan baharu. Karya penuh boleh dibaca semula apabila langganan diaktifkan." },
  { q: "Bolehkah saya memadam akaun?", a: "Boleh. Anda boleh memadam akaun pada bila-bila masa di halaman Akaun. Pemadaman tidak boleh dipulihkan." },
];

async function loadPage() {
  const repo = await initContentRepository();
  const works = repo.getWorks();
  const stats = statItems(computeSiteStats(works, repo.getPublishedSeries().length));
  // The picture behind the first screen is one ready-made file, made once a month (see lib/reader/start-wall.ts).
  const wall = await getWall(getDb());
  const slugs = [...(await sampleSlugs(getDb()))];
  const samples: Sample[] = [];
  for (const slug of slugs.slice(0, 12)) {
    const work = repo.source === "database" ? repo.getWork(slug) : undefined;
    if (!work) continue;
    samples.push({ summary: projectPublicWorkSummary(work), href: hrefOf(work) });
  }
  return { stats, wall, samples: samples.slice(0, visibleSampleCount(samples.length)) };
}

export default async function StartPage() {
  if (!readerAccountsEnabled()) notFound();
  const session = await currentReaderSession();
  const { stats, wall, samples } = await loadPage();
  const grounds = await homeGrounds();
  const libraryOpen = await siteOpenForViewer();

  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <section className="start-hero-band" aria-labelledby="mula-tajuk">
          {wall ? (
            <div className="start-wall" aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={wall.url} alt="" width={1850} height={410} decoding="async" fetchPriority="low" />
            </div>
          ) : null}
          <div className="site-shell start-hero-inner">
            <p className="story-kicker">Selamat datang</p>
            <h1 id="mula-tajuk">Selami dunia melalui cerita</h1>
            <p className="dek">Cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Baca semuanya percuma selama 14 hari.</p>
            {session ? (
              <p className="start-actions"><a className="start-button" href="/akaun">Pergi ke akaun saya</a></p>
            ) : (
              <div className="start-signup">
                <p className="start-signup-lead">Masukkan e-mel anda untuk log masuk atau mendaftar.</p>
                <LoginForm next="/akaun" compact />
                <p className="start-fine"><a className="start-link" href="/tebus">Sudah ada kod langganan?</a></p>
              </div>
            )}
          </div>
        </section>

        <div className="homepage start-stats-wrap"><HomeStats stats={stats} ground={grounds.stats} plain={!libraryOpen} /></div>

        <div className="site-shell start-page">

          {samples.length > 0 ? (
            <section className="start-section" aria-labelledby="contoh">
              <h2 id="contoh">Baca dahulu, tanpa log masuk</h2>
              <p className="start-lead">Cerita pilihan yang boleh dibaca penuh tanpa akaun.</p>
              <div className={samples.length < 3 ? "start-samples start-samples--few" : "start-samples"}>
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
            <h2 id="sebab">Mengapa membaca di Jalin</h2>
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
            <h2 id="langkah">Cara bermula</h2>
            <ol className="start-steps">
              {STEPS.map((step, index) => (
                <li key={step.title}>
                  <span className="start-step-number" aria-hidden="true">{index + 1}</span>
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
            <p className="start-fine">Kad langganan belum tersedia.</p>
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
            <a className="start-button" href={session ? "/akaun" : "/log-masuk"}>{session ? "Pergi ke akaun saya" : "Log masuk untuk mula membaca"}</a>
            <p className="start-fine">Anda sentiasa boleh log masuk untuk menebus kod atau mengurus akaun, walaupun percubaan sudah tamat.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
