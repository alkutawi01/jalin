import { sql } from "kysely";
import { getDb } from "../../../../../lib/db";
import { logActivity } from "../../../../../lib/admin/activity";
import { actor, bad, guarded, json, readBody, sameOriginOrRefuse, str } from "../../../../../lib/admin/langganan-api";
import { sampleSlugs, setSample } from "../../../../../lib/reader-auth/switches";

export const dynamic = "force-dynamic";

/** Every published work with whether it is open to everyone as a sample. */
export async function GET() {
  return guarded(async () => {
    const db = getDb();
    const rows = await sql<{ slug: string; title: string; type: string }>`
      SELECT slug, title, type FROM works WHERE status = 'published' ORDER BY type, title`.execute(db);
    const samples = await sampleSlugs(db);
    return json({ works: rows.rows.map((w) => ({ slug: w.slug, title: w.title, type: w.type, sample: samples.has(w.slug) })), samples: samples.size });
  });
}

/** POST { slug, sample }: open (or close again) one work to everyone. */
export async function POST(request: Request) {
  return guarded(async () => {
    const refused = sameOriginOrRefuse(request);
    if (refused) return refused;
    const body = await readBody(request);
    const slug = str(body.slug, 200);
    if (!slug) return bad("Cerita tidak dikenali.");
    const db = getDb();
    const exists = await sql<{ n: string }>`SELECT count(*) AS n FROM works WHERE slug = ${slug} AND status = 'published'`.execute(db);
    if (Number(exists.rows[0]?.n ?? 0) === 0) return bad("Cerita tidak dijumpai atau belum diterbitkan.", 404);
    const sample = body.sample === true;
    const who = await actor();
    await setSample(db, slug, sample, who.name);
    await logActivity({ action: "subscription.switch", subjectType: "sample", subjectId: slug, summary: sample ? `Dibuka kepada semua sebagai contoh: ${slug}` : `Ditutup semula: ${slug}` });
    return json({ ok: true, slug, sample });
  });
}
