import type { ReactNode } from "react";
import JalinEmblem from "./JalinEmblem";
import { SiteFooter, SiteHeader } from "./StoryChrome";

/** A plain page of reading: the site's header and footer around one narrow column of text. */
export function InfoPage({ kicker, title, intro, updated, active, emblem, children }: { kicker: string; title: string; intro: string; updated?: string; active?: string; emblem?: boolean; children: ReactNode }) {
  return (
    <>
      <SiteHeader active={active} />
      <main id="kandungan" tabIndex={-1}>
        <article className="site-shell info-page">
          {emblem ? <div className="info-emblem"><JalinEmblem size={72} /></div> : null}
          <p className="story-kicker">{kicker}</p>
          <h1>{title}</h1>
          <p className="dek">{intro}</p>
          <div className="info-body">{children}</div>
          {updated ? <p className="info-updated">Dikemas kini: {updated}</p> : null}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
