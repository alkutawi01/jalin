import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentAdmin } from "../../../lib/admin/auth";
import { buildLiveSnapshot } from "../../../lib/admin/revision-service";
import { hasDb } from "../../../lib/db";
import { initContentRepository } from "../../../lib/content";
import { workFromSnapshot } from "../../../lib/content/database-repository";
import type { SeriesEpisodeRef } from "../../../lib/content/types";
import WorkView from "../../../components/reader/WorkView";
import EpisodeView from "../../../components/reader/EpisodeView";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pratonton", robots: { index: false, follow: false } };

/**
 * The editor's preview: the page a reader would get, built from the draft as it is saved right now. It renders the same
 * components as the public page (WorkView / EpisodeView), so what the editor sees here is what a reader sees once the work is
 * published. Only an admin can open it.
 */
export default async function PreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bab?: string }>;
}) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const { bab } = await searchParams;
  if (!hasDb()) notFound();

  const snapshot = await buildLiveSnapshot(id);
  if (!snapshot) notFound();
  const work = workFromSnapshot(snapshot, id);
  if (!work) notFound();
  const published = snapshot.status === "published";

  const banner = (
    <div className="preview-banner" role="note">
      <div className="site-shell preview-banner-inner">
        <p>
          <strong>Pratonton.</strong> Ini halaman yang akan dilihat pembaca, daripada draf yang tersimpan sekarang
          (perubahan yang belum disimpan tidak kelihatan).{" "}
          {published
            ? "Karya ini sudah terbit: pembaca masih melihat versi yang diterbitkan, bukan draf ini, sehingga anda menerbitkannya semula."
            : "Pembaca belum melihatnya sehingga ia diterbitkan."}
        </p>
        <a href={`/admin/works/${id}`}>Kembali ke editor</a>
      </div>
    </div>
  );

  if (work.type === "bersiri") {
    let episodes: SeriesEpisodeRef[] = [];
    if (work.series) {
      const repo = await initContentRepository();
      if (repo.source === "database") episodes = repo.getPublishedSeriesEpisodes(work.series.id);
    }
    return (
      <>
        {banner}
        <EpisodeView work={work} episodes={episodes} preview />
      </>
    );
  }

  return (
    <>
      {banner}
      <WorkView work={work} sectionSlug={bab} preview={{ base: `/pratonton/${id}` }} />
    </>
  );
}
