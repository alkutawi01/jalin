"use client";

import Script from "next/script";

/**
 * Aggregate page counts, without cookies and without a personal identifier. Two providers, each switched on separately:
 *
 *   Vercel Web Analytics   on the live site only (the layout passes `vercel`); it also has to be switched on in the Vercel project.
 *   Cloudflare Web Analytics   asleep until a site token is set (CF_ANALYTICS_TOKEN on Vercel).
 *
 * Pages of the admin, of a reader's own account, the API and previews are never counted. The Dasar privasi names both providers.
 */
export const ANALYTICS_SKIP = /^\/(admin|akaun|api|pratonton)(\/|$)/;

export default function SiteAnalytics({ vercel, cloudflareToken }: { vercel: boolean; cloudflareToken: string }) {
  return (
    <>
      {vercel ? (
        <>
          <Script id="vercel-analytics-init" strategy="afterInteractive">
            {`window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.va('beforeSend',function(e){var p;try{p=new URL(e.url).pathname}catch(x){return e}return ${String(ANALYTICS_SKIP)}.test(p)?null:e});`}
          </Script>
          <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
        </>
      ) : null}
      {cloudflareToken ? (
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          strategy="afterInteractive"
          data-cf-beacon={JSON.stringify({ token: cloudflareToken, spa: true })}
        />
      ) : null}
    </>
  );
}
