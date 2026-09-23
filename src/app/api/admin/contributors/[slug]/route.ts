import { NextRequest, NextResponse } from "next/server";
import { getContributor, updateContributor } from "../../../../../lib/admin/contributor-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const contributor = await getContributor(slug);

    if (!contributor) {
      return NextResponse.json({ error: "Penyumbang tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(contributor);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();

    // Check if contributor exists
    const existing = await getContributor(slug);
    if (!existing) {
      return NextResponse.json({ error: "Penyumbang tidak ditemui." }, { status: 404 });
    }

    // Validate kind if provided
    if (body.kind) {
      const validKinds = ["human", "virtual", "organization"];
      if (!validKinds.includes(body.kind)) {
        return NextResponse.json({ error: "Jenis tidak sah." }, { status: 400 });
      }
    }

    const contributor = await updateContributor(slug, {
      displayName: body.displayName,
      slug: body.slug,
      kind: body.kind,
      bio: body.bio,
      disclosure: body.disclosure,
      isVisible: body.isVisible,
    });

    return NextResponse.json(contributor);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
