import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import RedeemForm from "../../components/reader/RedeemForm";
import { readerAccountsEnabled } from "../../lib/reader-auth/http";
import { currentReaderSession } from "../../lib/reader-auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tebus kod langganan",
  robots: { index: false, follow: false },
};

export default async function RedeemPage() {
  if (!readerAccountsEnabled()) notFound();
  if (!(await currentReaderSession())) redirect("/log-masuk");
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <RedeemForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
