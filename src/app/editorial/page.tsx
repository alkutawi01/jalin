import type { Metadata } from "next";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import { loadEditorialCopy, type EditorialCopy } from "../../lib/editorial-page";
import { listTeam, type TeamMember } from "../../lib/reader/team";

export const dynamic = "force-dynamic";

const DESCRIPTION = "Siapa yang memilih, menyunting dan meluluskan cerita di Jalin, dan cara kami bekerja.";

export const metadata: Metadata = {
  title: "Editorial",
  description: DESCRIPTION,
  alternates: { canonical: "/editorial" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Editorial", description: DESCRIPTION, url: "/editorial", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Editorial", description: DESCRIPTION, images: [DEFAULT_SHARE_IMAGE.url] }
};

function EditorCard({ member }: { member: TeamMember }) {
  return (
    <a className="team-card team-card--editor" href={`/penulis/${member.slug}`}>
      <span className="team-card-body">
        <span className="team-card-name">{member.name}</span>
        <span className="team-card-role">{member.post?.title}</span>
        <span className="team-card-note">{member.post?.duty}</span>
      </span>
    </a>
  );
}

function ContributorCard({ member }: { member: TeamMember }) {
  return (
    <a className="team-card" href={`/penulis/${member.slug}`}>
      <span className="team-card-body">
        <span className="team-card-name">{member.name}</span>
        {member.kind === "virtual" ? <span className="team-card-virtual">Penulis maya</span> : null}
        {member.roles.length > 0 ? <span className="team-card-roles">{member.roles.join(" · ")}</span> : null}
      </span>
    </a>
  );
}

const WAYS = [1, 2, 3, 4] as const;

export default async function EditorialPage() {
  const copy: EditorialCopy = await loadEditorialCopy();
  let editors: TeamMember[] = [];
  let contributors: TeamMember[] = [];
  try {
    ({ editors, contributors } = await listTeam());
  } catch {
    // The rest of the page is still worth reading when the list cannot be loaded.
  }
  const hasVirtual = contributors.some((member) => member.kind === "virtual");

  return (
    <>
      <SiteHeader active="editorial" />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell editorial-page">
          <header className="editorial-intro">
            <p className="story-kicker">Di sebalik Jalin</p>
            <h1>Editorial</h1>
            <p className="dek">{copy.dek}</p>
            <p className="editorial-definition">{copy.definition}</p>
          </header>

          {copy.heroSrc ? (
            <figure className="editorial-hero">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={copy.heroSrc} alt={copy.heroAlt} />
            </figure>
          ) : null}

          {editors.length > 0 ? (
            <section className="editorial-section" aria-labelledby="penyuntingan">
              <h2 id="penyuntingan">{copy["heading.editors"]}</h2>
              {editors.map((member) => <EditorCard key={member.slug} member={member} />)}
            </section>
          ) : null}

          {contributors.length > 0 ? (
            <section className="editorial-section" aria-labelledby="penulis">
              <h2 id="penulis">{copy["heading.writers"]}</h2>
              {hasVirtual ? <p className="editorial-disclosure">{copy.disclosure}</p> : null}
              <div className="team-grid">
                {contributors.map((member) => <ContributorCard key={member.slug} member={member} />)}
              </div>
            </section>
          ) : null}

          <section className="editorial-section" aria-labelledby="cara-bekerja">
            <h2 id="cara-bekerja">{copy["heading.ways"]}</h2>
            <ul className="ways-grid">
              {WAYS.map((n) => (
                <li key={n} className="ways-item">
                  <h3>{copy[`way.${n}.title`]}</h3>
                  <p>{copy[`way.${n}.text`]}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
