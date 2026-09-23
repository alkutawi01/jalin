import { NextRequest, NextResponse } from "next/server";
import { getPromptTemplate, updatePromptTemplate, deletePromptTemplate } from "../../../../../lib/admin/prompt-template-service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const template = await getPromptTemplate(numId);

    if (!template) {
      return NextResponse.json({ error: "Prompt template tidak ditemui." }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getPromptTemplate(numId);
    if (!existing) {
      return NextResponse.json({ error: "Prompt template tidak ditemui." }, { status: 404 });
    }

    const body = await request.json();

    const template = await updatePromptTemplate(numId, {
      name: body.name,
      promptText: body.promptText,
      scope: body.scope,
      workType: body.workType,
      workId: body.workId,
      version: body.version,
      status: body.status,
    });

    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const numId = parseInt(id, 10);

    if (isNaN(numId)) {
      return NextResponse.json({ error: "ID tidak sah." }, { status: 400 });
    }

    const existing = await getPromptTemplate(numId);
    if (!existing) {
      return NextResponse.json({ error: "Prompt template tidak ditemui." }, { status: 404 });
    }

    await deletePromptTemplate(numId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
