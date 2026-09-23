import { NextRequest, NextResponse } from "next/server";
import { listPromptTemplates, createPromptTemplate } from "../../../../lib/admin/prompt-template-service";

export async function GET() {
  try {
    const templates = await listPromptTemplates();
    return NextResponse.json(templates);
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

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name diperlukan." }, { status: 400 });
    }
    if (!body.promptText?.trim()) {
      return NextResponse.json({ error: "promptText diperlukan." }, { status: 400 });
    }

    const template = await createPromptTemplate({
      name: body.name.trim(),
      promptText: body.promptText.trim(),
      scope: body.scope || "global",
      workType: body.workType,
      workId: body.workId,
      version: body.version,
      status: body.status,
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Ralat tidak diketahui." },
      { status: 500 }
    );
  }
}
