import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { getAccess, listLedger } from "../../../../lib/reader-auth/entitlements";
import { listReading, listSaved } from "../../../../lib/reader-auth/library";
import { getPrefs, listDevices } from "../../../../lib/reader-auth/service";
import { initContentRepository } from "../../../../lib/content";

export const dynamic = "force-dynamic";

/**
 * The reader's own data as one JSON file (access and portability): the account, the access they have had, reading settings, the
 * list of works they opened and saved, and the devices signed in. Only the signed-in reader's own record; never cached.
 */
export async function GET(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const current = await currentSession(request);
  if (!current) return NextResponse.json({ error: "Anda belum log masuk." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const db = getDb();
  const { account } = current.session;
  const [prefs, ledger, access, devices, reading, saved, repo] = await Promise.all([
    getPrefs(db, account.id),
    listLedger(db, account.id),
    getAccess(db, account.id),
    listDevices(db, account.id),
    listReading(db, account.id, 100),
    listSaved(db, account.id, 200),
    initContentRepository(),
  ]);
  const titleById = new Map(repo.getWorks().map((w) => [w.id, w.title]));
  const body = {
    dibuat: new Date().toISOString(),
    akaun: {
      emel: account.email,
      nama: account.displayName,
      percubaanBermula: account.trialStartsAt,
      percubaanTamat: account.trialEndsAt,
    },
    akses: {
      keadaan: access.state,
      tamat: access.endsAt,
      sejarah: ledger.map((e) => ({ jenis: e.kind, mula: e.startsAt, tamat: e.endsAt, dibatalkan: e.revokedAt !== null })),
    },
    tetapanBacaan: prefs,
    bacaanSaya: reading.map((r) => ({ karya: titleById.get(r.workId) ?? null, bab: r.sectionSlug, dikemaskini: r.updatedAt })),
    disimpan: saved.map((r) => ({ karya: titleById.get(r.workId) ?? null, disimpan: r.savedAt })),
    peranti: devices.map((d) => ({ nama: d.label, terakhirDigunakan: d.lastSeenAt })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="data-akaun-jalin.json"',
      "Cache-Control": "no-store",
    },
  });
}
