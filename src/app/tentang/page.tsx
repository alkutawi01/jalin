import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import { DEFAULT_SHARE_IMAGE } from "../../lib/seo";
import { InfoPage } from "../../components/reader/InfoPage";
import { ABOUT_SECTIONS, loadAboutCopy } from "../../lib/about-page";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tentang Kami",
  description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.",
  alternates: { canonical: "/tentang" },
  openGraph: { type: "website", siteName: "Jalin — oleh Adjung", title: "Tentang Kami", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", url: "/tentang", locale: "ms_MY", images: [DEFAULT_SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: "Tentang Kami", description: "Jalin ialah platform bacaan sastera berilustrasi Bahasa Melayu, terbitan Adjung Press.", images: [DEFAULT_SHARE_IMAGE.url] }
};

export default async function AboutPage() {
  const copy = await loadAboutCopy();
  return (
    <InfoPage kicker="Tentang Kami" title="Selami dunia melalui cerita" intro={copy.intro} active="tentang" emblem>
      {ABOUT_SECTIONS.map((n) => (
        <div key={n}>
          <h2 id={n === 6 ? "hubungi" : undefined}>{copy[`s${n}.heading`]}</h2>
          <ReactMarkdown>{copy[`s${n}.body`]}</ReactMarkdown>
        </div>
      ))}
    </InfoPage>
  );
}
