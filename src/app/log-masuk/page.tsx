import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import LoginForm from "../../components/reader/LoginForm";
import { readerAccountsEnabled } from "../../lib/reader-auth/http";
import { currentReaderSession } from "../../lib/reader-auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Log masuk atau daftar",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (!readerAccountsEnabled()) notFound();
  if (await currentReaderSession()) redirect("/akaun");
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <LoginForm />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
