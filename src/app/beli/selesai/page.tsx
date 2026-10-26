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
                <p className="auth-intro">Kami tidak dapat menemukan pesanan ini. Semak semula alamat halaman yang anda buka.</p>
                <p className="auth-fine">Jika anda sudah membuat pembayaran, hubungi <a href="mailto:editorial@adjung.com">editorial@adjung.com</a> untuk mendapatkan bantuan. Sertakan nombor pesanan anda jika ada.</p>
              </>
            ) : order.status === "CANCELLED" ? (
              <>
                <h1 className="auth-title">Pesanan dibatalkan</h1>
                <p className="auth-intro">Pesanan <strong>{reference}</strong> telah dibatalkan. Tiada caj dibuat bagi pesanan ini.</p>
                <p className="auth-fine">Anda boleh <a href="/beli">membuat pesanan baharu</a>.</p>
              </>
            ) : order.status === "PENDING" ? (
              <>
                <h1 className="auth-title">Menunggu pengesahan bayaran</h1>
                <p className="auth-intro">Kami belum menerima pengesahan bayaran bagi pesanan <strong>{reference}</strong>.</p>
                <p className="auth-fine">Jika anda sudah membuat pembayaran, kod langganan akan dihantar ke e-mel anda sebaik sahaja pembayaran disahkan. Jangan buat pembayaran semula untuk pesanan yang sama sementara menunggu pengesahan. <a href={`/beli/selesai?ref=${reference}`}>Muat semula halaman ini</a> untuk menyemak status pesanan.</p>
              </>
            ) : order.delivery === "SENT" ? (
              <>
                <h1 className="auth-title">Kod telah dihantar</h1>
                <p className="auth-intro">Pembayaran anda telah disahkan. Nombor siri dan kod langganan {order.months} bulan telah dihantar ke <strong>{order.emailHint}</strong>.</p>
                <p className="auth-fine">Jika e-mel itu tiada dalam peti masuk, semak folder spam atau sampah.</p>
                <p className="auth-fine">Seterusnya, daftar akaun Jalin atau log masuk jika anda sudah mempunyai akaun. Kemudian, buka halaman <a href="/tebus">Tebus kod</a> dan masukkan nombor siri serta kod langganan anda.</p>
                <p className="auth-fine">Nombor pesanan anda: <strong>{reference}</strong></p>
              </>
            ) : (
              <>
                <h1 className="auth-title">Pembayaran diterima</h1>
                <p className="auth-intro">Pembayaran bagi pesanan <strong>{reference}</strong> telah disahkan. E-mel yang mengandungi kod langganan {order.months} bulan sedang dihantar ke <strong>{order.emailHint}</strong>.</p>
                <p className="auth-fine">Jika e-mel masih belum diterima selepas beberapa minit, semak folder spam atau sampah. Anda juga boleh menghubungi <a href="mailto:editorial@adjung.com">editorial@adjung.com</a> dan menyatakan nombor pesanan <strong>{reference}</strong> untuk mendapatkan bantuan.</p>
              </>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
