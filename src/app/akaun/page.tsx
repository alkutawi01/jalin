import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import AccountPanel from "../../components/reader/AccountPanel";
import { getDb } from "../../lib/db";
import { readerAccountsEnabled } from "../../lib/reader-auth/http";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { getPrefs, listDevices } from "../../lib/reader-auth/service";

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
  const [devices, prefs] = await Promise.all([listDevices(db, session.account.id), getPrefs(db, session.account.id)]);
  const trialEndsAt = session.account.trialEndsAt;
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <AccountPanel
            email={session.account.email}
            displayName={session.account.displayName}
            trialEndsAt={trialEndsAt ? trialEndsAt.toISOString() : null}
            trialActive={!!trialEndsAt && trialEndsAt.getTime() > Date.now()}
            thisDeviceId={session.device.id}
            devices={devices.map((d) => ({ id: d.id, label: d.label, lastSeenAt: d.lastSeenAt.toISOString() }))}
            prefs={prefs}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
