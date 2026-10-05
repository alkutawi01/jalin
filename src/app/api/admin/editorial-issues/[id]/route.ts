import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getDb } from "../../../../../lib/db";
import { recordIssueEvent } from "../../../../../lib/admin/issue-events";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Sesi anda telah tamat. Log masuk semula." }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await _request.json();
    
    const validStatuses = ["open", "ignored", "resolved"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak sah." }, { status: 400 });
    }
    
    const db = getDb();
    const issue = await db.selectFrom("editorial_issues").where("id", "=", id).selectAll().executeTakeFirst();
    
    if (!issue) {
      return NextResponse.json({ error: "Isu tidak ditemui." }, { status: 404 });
    }
    
    // resolved_at belongs to "resolved" only: reopening or ignoring clears it.
    const updateData: any = {
      status: body.status,
      resolved_at: body.status === "resolved" ? new Date().toISOString() : null,
    };

    await db.updateTable("editorial_issues").where("id", "=", id).set(updateData).execute();
    // Every manual change is on the issue's history, like the changes the system makes.
    if (issue.status !== body.status) {
      await recordIssueEvent(id, body.status === "resolved" ? "resolve" : body.status === "ignored" ? "ignore" : "reopen", issue.status, body.status, admin.email ?? admin.id ?? "admin");
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}