import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import AccountPanel from "../../components/reader/AccountPanel";
import { getDb } from "../../lib/db";
import { macKey, readerAccountsEnabled } from "../../lib/reader-auth/http";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { canStartTrial, getPrefs, listDevices } from "../../lib/reader-auth/service";
import { getAccess, listLedger } from "../../lib/reader-auth/entitlements";
import { listReading, listSaved } from "../../lib/reader-auth/library";
import { initContentRepository } from "../../lib/content";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Akaun saya",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  if (!readerAccountsEnabled()) notFound();
  const session = await currentReaderSession();
  if (!session) redirect("/log-masuk");
  const db = getDb();
  const [devices, prefs, access, trialAvailable, ledger, progress, repo, savedRows] = await Promise.all([
    listDevices(db, session.account.id),
    getPrefs(db, session.account.id),
    getAccess(db, session.account.id),
    canStartTrial(db, { key: macKey() }, session.account.id),
    listLedger(db, session.account.id),
    listReading(db, session.account.id),
    initContentRepository(),
    listSaved(db, session.account.id),
  ]);
  const KIND_LABEL: Record<string, string> = { TRIAL: "Percubaan percuma", CARD: "Kad langganan", SHARED: "Kod kongsi", ADMIN: "Diberi oleh Jalin" };
  const history = [...ledger].reverse().map((e) => ({
    id: e.id,
    label: KIND_LABEL[e.kind] ?? "Akses",
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    revoked: e.revokedAt !== null,
  }));
  // The list names works by their address: look each one up among the published works (a work taken down simply drops off the list).
  const byId = new Map(repo.getWorks().map((w) => [w.id, w]));
  const KIND_NAME: Record<string, string> = { cerpen: "Cerpen", novela: "Novela", bersiri: "Bersiri", fragmen: "Fragmen", sinopsis: "Sinopsis" };
  const saved = savedRows.flatMap((r) => {
    const w = byId.get(r.workId);
    if (!w) return [];
    const href = w.type === "bersiri" && w.series ? "/kategori/bersiri/" + w.series.slug + "/" + w.slug : "/kategori/" + w.type + "/" + w.slug;
    return [{ workId: w.id, title: w.title, href, kind: KIND_NAME[w.type] ?? w.type, savedAt: r.savedAt.toISOString() }];
  });
  const reading = progress.flatMap((p) => {
    const w = byId.get(p.workId);
    if (!w) return [];
    const base = w.type === "bersiri" && w.series ? "/kategori/bersiri/" + w.series.slug + "/" + w.slug : "/kategori/" + w.type + "/" + w.slug;
    const section = p.sectionSlug ? (w.sections?.length ? w.sections : repo.getReadingSections(w.id)).find((s) => s.slug === p.sectionSlug) : undefined;
    return [{
      workId: w.id,
      title: w.title,
      href: section ? base + "/" + section.slug : base,
      kind: KIND_NAME[w.type] ?? w.type,
      chapter: section ? section.title ?? section.slug : null,
      updatedAt: p.updatedAt.toISOString(),
    }];
  });
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <AccountPanel
            email={session.account.email}
            displayName={session.account.displayName}
            access={{ state: access.state, endsAt: access.endsAt ? access.endsAt.toISOString() : null, currentPeriodEndsAt: access.currentPeriodEndsAt ? access.currentPeriodEndsAt.toISOString() : null }}
            thisDeviceId={session.device.id}
            devices={devices.map((d) => ({ id: d.id, label: d.label, lastSeenAt: d.lastSeenAt.toISOString() }))}
            prefs={prefs}
            trialAvailable={trialAvailable}
            history={history}
            reading={reading}
            saved={saved}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
