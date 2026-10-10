import { SiteFooter, SiteHeader, StoryHead } from "./StoryChrome";
import LockDialog from "./LockDialog";
import { bylineFor } from "../../lib/reader/credit-projection";
import { displayableGenre } from "../../lib/reader/genre-display";
import { isDerivativeType } from "../../lib/credit-roles";
import type { Work } from "../../lib/content/types";

const TYPE_LABELS: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };

/**
 * A work kept for readers with access: its title, dek, picture and names, and the way in. It is given the title and the people only,
 * never the text: what is built here is all that reaches the browser.
 */
export default function LockedWork({
  work,
  gate,
  next,
  email
}: {
  work: Pick<Work, "type" | "title" | "dek" | "genre" | "credits" | "visuals" | "publishedAt" | "sourceWork">;
  gate: "sign_in" | "start_trial" | "subscribe";
  next: string;
  email: string | null;
}) {
  const hero = work.visuals.find((visual) => visual.role === "hero");
  const rights = `© ADJUNG ${(work.publishedAt ?? "2026").slice(0, 4)}`;
  const byline = bylineFor({ type: work.type, credits: work.credits, sourceWork: work.sourceWork });
  const kicker = [TYPE_LABELS[work.type] ?? work.type, displayableGenre(work.genre)].filter(Boolean).join(" · ");
  return (
    <>
      <SiteHeader active={work.type} />
      <main id="kandungan" tabIndex={-1}>
        <StoryHead
          kicker={kicker}
          title={work.title}
          dek={work.dek ?? ""}
          byline={byline}
          originalAuthorBesideTitle={isDerivativeType(work.type)}
          hero={hero?.src ? { src: hero.src, alt: hero.alt ?? "", rights, crop: hero.crop } : undefined}
        />
        <section className="site-shell lock-panel" aria-labelledby="lock-title">
          <h2 id="lock-title">{gate === "sign_in" ? "Cerita ini untuk pembaca yang log masuk" : gate === "start_trial" ? "Mulakan percubaan percuma untuk membaca" : "Akses anda belum aktif"}</h2>
          <p>
            {gate === "sign_in"
              ? "Log masuk dengan emel sahaja, tiada kata laluan. Pembaca baharu boleh memulakan percubaan percuma 14 hari."
              : gate === "start_trial"
                ? "Percubaan percuma 14 hari membolehkan anda membaca semua cerita di Jalin."
                : "Tebus kod langganan daripada kad untuk terus membaca."}
          </p>
          <LockDialog gate={gate} next={next} email={email} />
          <p className="lock-fine">
            {gate === "sign_in" ? <a href={`/log-masuk?next=${encodeURIComponent(next)}`}>Buka halaman log masuk</a> : <a href="/akaun">Akaun saya</a>}
            {" · "}
            <a href="/mula">Apa itu Jalin?</a>
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
