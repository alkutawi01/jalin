import { NextRequest, NextResponse } from "next/server";
import { publishWork, generatePublishPreview, rollbackWork, listBackups, workExistsAsMarkdown } from "../../../../lib/admin/publishing/publish-work";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const workId = searchParams.get("workId");
    const action = searchParams.get("action");

    if (action === "preview" && workId) {
      const preview = await generatePublishPreview(workId);
      return NextResponse.json(preview);
    }

    if (action === "backups" && workId) {
      const slug = searchParams.get("slug");
      if (!slug) {
        return NextResponse.json({ error: "slug diperlukan." }, { status: 400 });
      }
      const backups = listBackups(slug);
      return NextResponse.json({ backups });
    }

    if (action === "sync-status" && workId) {
      // Check sync status
      const preview = await generatePublishPreview(workId);
      let status = "IN_SYNC";

      if (preview.isNew) {
        status = "MARKDOWN_MISSING";
      } else if (preview.metadataChanged || preview.bodyChanged) {
        status = "DB_CHANGED";
      }

      return NextResponse.json({ status, preview });
    }

    return NextResponse.json({ error: "Action tidak sah." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "publish" && body.workId) {
      const result = await publishWork(body.workId);
      return NextResponse.json(result);
    }

    if (body.action === "rollback" && body.slug && body.timestamp) {
      const result = rollbackWork(body.slug, body.timestamp);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Action tidak sah." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
