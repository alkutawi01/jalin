import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdmin } from "./auth";
import type { PageCopyStore } from "../page-copy";

const SESSION_ENDED = "Sesi anda telah tamat. Log masuk semula.";

/**
 * The two handlers every editable public page needs: GET (each field with its saved text and its default, plus any saved extras
 * such as a picture) and POST { values: { field: text } } (save the changed fields; empty goes back to the default).
 */
export function pageCopyHandlers<D extends Record<string, string>>(store: PageCopyStore<D>) {
  async function GET() {
    if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
    const saved = await store.saved();
    return NextResponse.json({
      fields: store.fields.map((field) => ({ field, saved: saved[field] ?? "", default: store.defaults[field] })),
      hero: { src: saved["hero.src"] ?? "", alt: saved["hero.alt"] ?? "" }
    });
  }

  async function POST(request: NextRequest) {
    if (!(await getCurrentAdmin())) return NextResponse.json({ error: SESSION_ENDED }, { status: 401 });
    const body = (await request.json().catch(() => ({}))) as { values?: Record<string, unknown> };
    if (!body.values || typeof body.values !== "object") return NextResponse.json({ error: "Teks diperlukan." }, { status: 400 });
    const values: Record<string, string> = {};
    for (const [field, text] of Object.entries(body.values)) {
      if (!store.isField(field)) return NextResponse.json({ error: "Medan tidak dikenali." }, { status: 400 });
      if (typeof text !== "string") return NextResponse.json({ error: "Teks diperlukan." }, { status: 400 });
      values[field] = text;
    }
    try {
      await store.save(values as never);
      return NextResponse.json({ ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ralat.";
      return NextResponse.json({ error: message }, { status: message.startsWith("Teks") ? 400 : 500 });
    }
  }

  return { GET, POST };
}
