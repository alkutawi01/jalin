import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import LoginForm from "../../components/reader/LoginForm";
import { readerAccountsEnabled } from "../../lib/reader-auth/http";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { safeNextPath } from "../../lib/reader-auth/next-path";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log masuk atau daftar",
  robots: { index: false, follow: false },
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  if (!readerAccountsEnabled()) notFound();
  const next = safeNextPath((await searchParams).next);
  if (await currentReaderSession()) redirect(next);
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <LoginForm next={next} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
