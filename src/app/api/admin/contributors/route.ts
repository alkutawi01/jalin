import { NextRequest, NextResponse } from "next/server";
import { listContributors, createContributor } from "../../../../lib/admin/contributor-service";

export async function GET() {
  try {
    const contributors = await listContributors();
    return NextResponse.json(contributors);
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

    // Validation
    if (!body.displayName?.trim()) {
      return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });
    }
    if (!body.slug?.trim()) {
      return NextResponse.json({ error: "Slug diperlukan." }, { status: 400 });
    }
    if (!body.kind) {
      return NextResponse.json({ error: "Jenis diperlukan." }, { status: 400 });
    }

    const validKinds = ["human", "virtual", "organization"];
    if (!validKinds.includes(body.kind)) {
      return NextResponse.json({ error: "Jenis tidak sah." }, { status: 400 });
    }

    const contributor = await createContributor({
      displayName: body.displayName.trim(),
      slug: body.slug.trim(),
      kind: body.kind,
      bio: body.bio || undefined,
      disclosure: body.disclosure || undefined,
      isVisible: body.isVisible !== false,
    });

    return NextResponse.json(contributor, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
