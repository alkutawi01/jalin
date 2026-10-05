import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../../../../lib/admin/auth";

/**
 * Switched off. Reverting wrote a new published revision from the old snapshot but put back only a few columns of the work (text, dek,
 * genre, audience, minutes), not its credits, pictures, glossary, chapters, source record, characters or note; and it published the result
 * without the readiness checks. The next edit and "Terbitkan semula" would then bring back what had been rolled back. No page uses it. A
 * rollback has to restore the whole snapshot in one transaction before this answers again (see __tests__/revert-disabled.test.ts).
 */
export async function POST(
  _request: NextRequest,
  _context: { params: Promise<{ id: string; revisionId: string }> }
) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
  return NextResponse.json(
    { error: "Pemulihan ke versi lama dimatikan buat sementara kerana ia hanya memulihkan sebahagian karya. Sunting karya secara terus, atau minta bantuan." },
    { status: 501 }
  );
}
