import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../../components/reader/StoryChrome";
import { getDb } from "../../../lib/db";
import { accountsPageMetadata } from "../../../lib/reader-auth/enabled";
import { codeKey, mailer, readerAccountsEnabled } from "../../../lib/reader-auth/http";
import { deliverOrder, orderPublicStatus } from "../../../lib/reader-auth/orders";
import { SITE_URL } from "../../../lib/seo";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return accountsPageMetadata({ title: "Pesanan anda", robots: { index: false, follow: false } });
}

/**
 * Where the gateway sends the buyer back. It shows only what is safe (the state of the order and a hint of the address), never the code,
 * and proves nothing: the order is paid by the gateway's own call, not by this page. If the order is paid but the e-mail is still
 * waiting, opening this page tries to send it (an order already sent, or tried a moment ago, is left alone).
 */
export default async function OrderDonePage({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  if (!readerAccountsEnabled()) notFound();
  const raw = (await searchParams).ref;
  const reference = typeof raw === "string" ? raw : "";
  const db = getDb();
  let order = await orderPublicStatus(db, reference).catch(() => ({ found: false as const }));
  if (order.found && order.status === "PAID" && order.delivery === "PENDING") {
    try {
      await deliverOrder(db, { codeKey: codeKey(), mailer: mailer(), siteUrl: SITE_URL }, order.orderId);
      order = await orderPublicStatus(db, reference);
    } catch {
      // The e-mail will be tried again by the scheduled job or by hand; the page says so below.
    }
  }
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <div className="auth-card auth-card--card">
            {!order.found ? (
              <>
                <h1 className="auth-title">Pesanan tidak ditemui</h1>
                <p className="auth-intro">Semak alamat yang anda buka. Jika anda sudah membayar, kod akan sampai ke e-mel anda. Hubungi <a href="mailto:editorial@adjung.com">editorial@adjung.com</a> jika perlu.</p>
              </>
            ) : order.status === "CANCELLED" ? (
              <>
                <h1 className="auth-title">Pesanan dibatalkan</h1>
                <p className="auth-intro">Pesanan <strong>{reference}</strong> tidak diteruskan dan tiada caj dibuat. Anda boleh <a href="/beli">membuat pesanan baharu</a>.</p>
              </>
            ) : order.status === "PENDING" ? (
              <>
                <h1 className="auth-title">Menunggu pengesahan bayaran</h1>
                <p className="auth-intro">Kami belum menerima pengesahan bayaran bagi pesanan <strong>{reference}</strong>. Jika anda sudah membayar, kod akan dihantar ke e-mel anda sebaik pembayaran disahkan; anda tidak perlu membayar semula. <a href={`/beli/selesai?ref=${reference}`}>Muat semula halaman ini</a>.</p>
              </>
            ) : order.delivery === "SENT" ? (
              <>
                <h1 className="auth-title">Kod telah dihantar</h1>
                <p className="auth-intro">Pembayaran diterima. Kod langganan {order.months} bulan telah dihantar ke <strong>{order.emailHint}</strong>. Jika tiada dalam peti masuk, semak folder spam atau sampah.</p>
                <p className="auth-fine">Seterusnya: daftar atau log masuk, kemudian <a href="/tebus">tebus kod anda</a>. Nombor pesanan anda: {reference}.</p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Pembayaran diterima</h1>
                <p className="auth-intro">E-mel dengan kod langganan {order.months} bulan sedang dihantar ke <strong>{order.emailHint}</strong>. Jika ia tidak sampai dalam beberapa minit, hubungi <a href="mailto:editorial@adjung.com">editorial@adjung.com</a> dan nyatakan nombor pesanan <strong>{reference}</strong>.</p>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
