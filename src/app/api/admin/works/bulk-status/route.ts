import { NextRequest, NextResponse } from "next/server";
import { archiveWork, getWork, updateWork } from "../../../../../lib/admin/work-service";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { logActivity } from "../../../../../lib/admin/activity";
import { can, roleFromClaim } from "../../../../../lib/admin/permissions";

export const dynamic = "force-dynamic";

const MAX_WORKS = 100;

/**
 * Archive or restore several works in one step, from the works list or a series page.
 *
 *   { ids: [...], action: "archive" } every chosen work that is not archived becomes "archived" (text kept, hidden from readers).
 *   { ids: [...], action: "restore" } every chosen archived work becomes "draft", to be edited and published again.
 *
 * Nothing is deleted and nothing is published here. Taking a public work off the site is the counterpart of publishing it, so
 * a published work is archived only by whoever may publish (the same rule as archiving one work, works/[id]).
 * Works are handled one by one; a work that cannot be changed is reported and the rest continue.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    const role = roleFromClaim(admin.role);

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "archive" && action !== "restore") {
      return NextResponse.json({ error: "Tindakan tidak sah." }, { status: 400 });
    }
    const ids: string[] = Array.isArray(body?.ids) ? [...new Set<string>(body.ids.filter((v: unknown): v is string => typeof v === "string" && v.length > 0))] : [];
    if (ids.length === 0) return NextResponse.json({ error: "Tiada karya dipilih." }, { status: 400 });
    if (ids.length > MAX_WORKS) return NextResponse.json({ error: `Paling banyak ${MAX_WORKS} karya sekali gus.` }, { status: 400 });

    const mayPublish = Boolean(role && can(role, "work.publish"));
    const changed: Array<{ id: string; title: string }> = [];
    const skipped: Array<{ id: string; title: string; reason: string }> = [];

    for (const id of ids) {
      const work = await getWork(id);
      if (!work) {
        skipped.push({ id, title: id, reason: "Karya tidak ditemui." });
        continue;
      }
      try {
        if (action === "archive") {
          if (work.status === "archived") {
            skipped.push({ id, title: work.title, reason: "Sudah diarkibkan." });
            continue;
          }
          if (work.status === "published" && !mayPublish) {
            skipped.push({ id, title: work.title, reason: "Hanya pemilik boleh mengarkibkan karya yang sudah terbit." });
            continue;
          }
          await archiveWork(id);
          changed.push({ id, title: work.title });
        } else {
          if (work.status !== "archived") {
            skipped.push({ id, title: work.title, reason: "Bukan karya diarkibkan." });
            continue;
          }
          await updateWork(id, { status: "draft" });
          changed.push({ id, title: work.title });
        }
      } catch (error) {
        skipped.push({ id, title: work.title, reason: error instanceof Error ? error.message : "Tidak dapat diubah." });
      }
    }

    if (changed.length > 0) {
      await logActivity({
        action: action === "archive" ? "work.bulk_archive" : "work.bulk_restore",
        subjectType: "work",
        subjectId: changed[0]!.id,
        summary: `${changed.length} karya: ${changed.slice(0, 5).map((c) => c.title).join(", ")}${changed.length > 5 ? "…" : ""}`
      });
    }

    return NextResponse.json({ ok: true, action, changed, skipped });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ralat tidak diketahui." }, { status: 500 });
  }
}
