import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "../../components/reader/StoryChrome";
import BuyForm from "../../components/reader/BuyForm";
import { accountsPageMetadata } from "../../lib/reader-auth/enabled";
import { formatRinggit, purchaseStatus } from "../../lib/subscription/prices";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return accountsPageMetadata({ title: "Beli kod langganan", robots: { index: false, follow: false } });
}

/** Buy a code online: choose the length, pay through the gateway, and the code is e-mailed. Exists only while buying is switched on. */
export default function BuyPage() {
  const status = purchaseStatus();
  if (!status.enabled) notFound();
  const plans = ([1, 6, 12] as const).map((months) => ({ months, label: `${months} bulan`, price: formatRinggit(status.prices[months]) }));
  return (
    <>
      <SiteHeader />
      <main id="kandungan" tabIndex={-1}>
        <div className="site-shell auth-page">
          <BuyForm plans={plans} />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
