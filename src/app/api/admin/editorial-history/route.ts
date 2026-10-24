import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../lib/admin/auth";
import { getAuditHistory } from "../../../../lib/admin/audit-history";
import { publicErrorMessage } from "../../../../lib/admin/api-errors";

export async function GET(_request: NextRequest) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    
    const history = await getAuditHistory(20);
    return NextResponse.json({ runs: history });
  } catch (error) {
    const message = publicErrorMessage(error, "Ralat tidak diketahui.");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}