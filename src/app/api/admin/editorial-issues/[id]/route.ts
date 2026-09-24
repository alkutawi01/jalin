import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "../../../../../lib/admin/auth";
import { getDb } from "../../../../../lib/db";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getCurrentAdmin();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await _request.json();
    
    const validStatuses = ["open", "ignored", "resolved"];
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    
    const db = getDb();
    const issue = await db.selectFrom("editorial_issues").where("id", "=", id).selectAll().executeTakeFirst();
    
    if (!issue) {
      return NextResponse.json({ error: "Issue not found" }, { status: 404 });
    }
    
    const updateData: any = {
      status: body.status,
    };
    
    if (body.status === "resolved") {
      updateData.resolved_at = new Date().toISOString();
    }
    
    await db.updateTable("editorial_issues").where("id", "=", id).set(updateData).execute();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}