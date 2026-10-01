import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../lib/admin/auth";
import { getDb } from "../../../../../../lib/db";
import { planLegacyImageMarkers } from "../../../../../../lib/admin/legacy-image-marker-plan";

type Context = { params: Promise<{ id: string }> };
type Backup = { beforeBody: string; afterBody: string; changes: { id: number; from: string; to: string }[] };

async function current(id: string) {
  const db = getDb();
  const work = await db.selectFrom("works").select(["id", "body", "metadata", "status"]).where("id", "=", id).executeTakeFirst();
  if (!work) return null;
  const visuals = await db.selectFrom("visuals").select(["id", "role", "anchor", "place"]).where("work_id", "=", id).orderBy("sort_order").orderBy("id").execute();
  return { work, visuals };
}

export async function GET(_request: NextRequest, { params }: Context) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const { id } = await params;
  const state = await current(id);
  if (!state) return NextResponse.json({ error: "Karya tidak ditemui." }, { status: 404 });
  const backup = (state.work.metadata ?? {}).imageMarkerBackup as Backup | undefined;
  return NextResponse.json({ plan: planLegacyImageMarkers(state.work.body ?? "", state.visuals), canRestore: Boolean(backup && backup.afterBody === state.work.body) });
}

export async function POST(request: NextRequest, { params }: Context) {
  if (!await getCurrentAdmin()) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  const { id } = await params;
  const payload = await request.json().catch(() => ({}));
  if (!(["apply", "restore"] as unknown[]).includes(payload.action)) {
    return NextResponse.json({ error: "Tindakan tidak sah." }, { status: 400 });
  }
  try {
    const result = await getDb().transaction().execute(async (tx) => {
      const work = await tx.selectFrom("works").select(["id", "body", "metadata"]).where("id", "=", id).forUpdate().executeTakeFirst();
      if (!work) throw new Error("Karya tidak ditemui.");
      const visuals = await tx.selectFrom("visuals").select(["id", "role", "anchor", "place"]).where("work_id", "=", id).orderBy("sort_order").orderBy("id").forUpdate().execute();
      const metadata = work.metadata ?? {};
      const backup = metadata.imageMarkerBackup as Backup | undefined;

      if (payload.action === "restore") {
        if (!backup || backup.afterBody !== work.body) throw new Error("Manuskrip sudah berubah; pemulihan automatik tidak selamat.");
        for (const change of backup.changes) {
          const visual = visuals.find((v) => v.id === change.id);
          if (visual?.anchor !== change.to) throw new Error("Penanda gambar sudah berubah; pemulihan automatik tidak selamat.");
        }
        for (const change of backup.changes) await tx.updateTable("visuals").set({ anchor: change.from }).where("id", "=", change.id).where("work_id", "=", id).execute();
        const { imageMarkerBackup: _discard, ...rest } = metadata;
        await tx.updateTable("works").set({ body: backup.beforeBody, metadata: rest, updated_at: new Date().toISOString() }).where("id", "=", id).execute();
        return { restored: backup.changes.length };
      }

      if (backup && backup.afterBody === work.body) throw new Error("Pulihkan migrasi terdahulu dahulu sebelum mencuba lagi.");
      const plan = planLegacyImageMarkers(work.body ?? "", visuals);
      if (plan.originalBody !== payload.expectedBody || !Array.isArray(payload.expectedChanges) || JSON.stringify(plan.changes) !== JSON.stringify(payload.expectedChanges)) {
        throw new Error("Pratonton sudah lapuk. Muat semula dan semak sebelum mengesahkan.");
      }
      if (!plan.changes.length) throw new Error("Tiada anchor lama yang boleh ditukar secara selamat.");
      for (const change of plan.changes) await tx.updateTable("visuals").set({ anchor: change.to }).where("id", "=", change.id).where("work_id", "=", id).execute();
      await tx.updateTable("works").set({ body: plan.body, metadata: { ...metadata, imageMarkerBackup: { beforeBody: plan.originalBody, afterBody: plan.body, changes: plan.changes } }, updated_at: new Date().toISOString() }).where("id", "=", id).execute();
      return { converted: plan.changes.length, skipped: plan.skipped };
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat migrasi gambar." }, { status: 409 });
  }
}
