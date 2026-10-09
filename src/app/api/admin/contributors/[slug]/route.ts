import { NextRequest, NextResponse } from "next/server";
import { getContributor, updateContributor } from "../../../../../lib/admin/contributor-service";
import { setContributorPost } from "../../../../../lib/admin/contributor-profile";

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
    if (body.displayName !== undefined && !String(body.displayName).trim()) {
      return NextResponse.json({ error: "Nama diperlukan." }, { status: 400 });
    }

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
      displayName: body.displayName?.trim(),
      slug: body.slug,
      kind: body.kind,
      bio: body.bio,
      disclosure: body.disclosure,
      isVisible: body.isVisible,
    });

    // The editorial post is saved with the rest; its own check (both fields or neither) can refuse it.
    if (body.postTitle !== undefined || body.postDuty !== undefined) {
      const post = await setContributorPost(contributor.slug, String(body.postTitle ?? ""), String(body.postDuty ?? ""));
      if (!post.ok) return NextResponse.json({ error: post.error }, { status: post.status });
    }

    return NextResponse.json(await getContributor(contributor.slug));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ralat tidak diketahui.";
    const status = message.includes("already exists") || message.includes("sudah digunakan") ? 409
      : message.includes("tidak ditemui") ? 404
      : message.startsWith("Alamat pautan") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
