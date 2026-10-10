import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { WorkCover } from "../../components/reader/WorkCover";
import { renderAttribution } from "../../components/reader/Attribution";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { initContentRepository } from "../../lib/content";
import { getDb } from "../../lib/db";
import { displayableGenre } from "../../lib/reader/genre-display";
import { projectPublicWorkSummary, type PublicWorkSummary } from "../../lib/reader/public-projection";
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

async function loadSamples(): Promise<Sample[]> {
  const slugs = [...(await sampleSlugs(getDb()))];
  if (slugs.length === 0) return [];
  const repo = await initContentRepository();
  const out: Sample[] = [];
  for (const slug of slugs.slice(0, 12)) {
    const work = repo.source === "database" ? repo.getWork(slug) : undefined;
    if (!work) continue;
    const href = work.type === "bersiri" && work.series ? `/kategori/bersiri/${work.series.slug}/${work.slug}` : `/kategori/${work.type}/${work.slug}`;
    out.push({ summary: projectPublicWorkSummary(work), href });
  }
  return out;
}

const STEPS = [
  { title: "Log masuk dengan emel", text: "Masukkan emel anda dan kami hantar kod enam digit. Tiada kata laluan untuk diingat." },
  { title: "Mulakan percubaan percuma", text: "Baca semua cerita di Jalin selama 14 hari. Tiada kad dan tiada bayaran." },
  { title: "Teruskan dengan kod langganan", text: "Selepas percubaan, tebus kod daripada kad langganan untuk terus membaca selama tempoh yang dipilih." }
];

export default async function StartPage() {
  if (!readerAccountsEnabled()) notFound();
  const session = await currentReaderSession();
  const samples = await loadSamples();
  const primary = session ? { href: "/akaun", label: "Pergi ke akaun saya" } : { href: "/log-masuk", label: "Log masuk dan mulakan percubaan" };

  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell start-page">
          <header className="start-hero">
            <p className="story-kicker">Mula membaca</p>
            <h1>Selami dunia melalui cerita</h1>
            <p className="dek">Jalin menerbitkan cerpen, novela dan cerita bersiri berilustrasi dalam Bahasa Melayu. Log masuk dengan emel, dan baca semuanya selama 14 hari tanpa bayaran.</p>
            <p className="start-actions">
              <a className="start-button" href={primary.href}>{primary.label}</a>
              {session ? null : <a className="start-link" href="/tebus">Saya ada kod langganan</a>}
            </p>
          </header>

          <section className="start-section" aria-labelledby="langkah">
            <h2 id="langkah">Bagaimana ia berfungsi</h2>
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

          <section className="start-section start-closing" aria-label="Mula">
            <a className="start-button" href={primary.href}>{primary.label}</a>
            <p className="start-fine">Anda sentiasa boleh log masuk untuk menebus kod atau mengurus akaun, walaupun percubaan sudah tamat.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
