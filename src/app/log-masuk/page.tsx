import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import LoginForm from "../../components/reader/LoginForm";
import { readerAccountsEnabled, readerCookieName } from "../../lib/reader-auth/http";
import { accountsPageMetadata } from "../../lib/reader-auth/enabled";
import { currentReaderSession } from "../../lib/reader-auth/server";
import { safeNextPath } from "../../lib/reader-auth/next-path";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return accountsPageMetadata({ title: "Log masuk atau daftar", robots: { index: false, follow: false } });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; padam?: string }> }) {
  if (!readerAccountsEnabled()) notFound();
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await currentReaderSession()) redirect(next);
  const oldSessionCookie = (await cookies()).has(readerCookieName());
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          {params.padam === "1" ? <p className="auth-notice" role="status">Akaun anda telah dipadam. E-mel dan tetapan anda tidak lagi disimpan.</p> : null}
          {oldSessionCookie ? <p className="auth-notice" role="status">Sesi peranti anda telah tamat atau tidak lagi sah. Sila log masuk semula.</p> : null}
          <LoginForm next={next} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
