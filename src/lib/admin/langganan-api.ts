/**
 * Small helpers shared by the admin routes under /api/admin/langganan: the same-origin check for changes, who is acting, a tidy error
 * when the tables are not there yet, and reading a label layout from a request. Who may call these routes is decided before they run
 * (permissions.ts: the owner only); nothing here grants anything.
 */
import { NextResponse } from "next/server";
import { getCurrentAdmin } from "./auth";
import { can, roleFromClaim, type Permission } from "./permissions";
import { isSameOrigin } from "../reader-auth/http";
import { DEFAULT_LABEL, type LabelSettings } from "../subscription/label";

export const bad = (message: string, status = 400) => NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

/** A change must come from the admin pages themselves. */
export function sameOriginOrRefuse(request: Request): NextResponse | null {
  return isSameOrigin(request) ? null : bad("Permintaan tidak dibenarkan.", 403);
}

export async function actor(): Promise<{ id: string; name: string }> {
  const admin = await getCurrentAdmin();
  return { id: admin?.id ?? "tidak-diketahui", name: admin?.name ?? "Tidak diketahui" };
}

/** Subscription handlers require a live owner account; middleware claims alone are never enough. */
export async function guarded(run: () => Promise<NextResponse>): Promise<NextResponse> {
  return guardedFor(run, "subscription.manage");
}

/** Panel handlers also recheck the live staff account while preserving the chief editor's approved permissions. */
export async function panelGuarded(run: () => Promise<NextResponse>, permission: "panel.manage" | "panel.settings" = "panel.manage"): Promise<NextResponse> {
  return guardedFor(run, permission);
}

async function guardedFor(run: () => Promise<NextResponse>, permission: Permission): Promise<NextResponse> {
  try {
    const admin = await getCurrentAdmin();
    const role = admin && roleFromClaim(admin.role);
    if (!role || !can(role, permission)) return bad("Anda tidak mempunyai kebenaran untuk tindakan ini.", 403);
    return await run();
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "42P01") return bad("Jadual langganan belum wujud pada pangkalan data ini. Migrasi 027 hingga 030 perlu dijalankan dahulu.", 503);
    if (error instanceof Error && /^(Invalid|A card|A batch|A reason|Unknown|The limit|Label text|Nothing to print)/.test(error.message)) return bad(error.message, 400);
    console.error("[langganan]", error);
    return bad("Tindakan tidak berjaya. Cuba lagi.", 500);
  }
}

export async function readBody(request: Request, maxBytes = 8192): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return {};
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const str = (value: unknown, max = 200): string => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** A layout from loose input (form fields or query parameters): numbers are read as numbers, anything missing keeps the default. */
export function layoutFrom(input: Record<string, unknown> | URLSearchParams | undefined): LabelSettings {
  const get = (key: string): unknown => (input instanceof URLSearchParams ? input.get(key) ?? undefined : input?.[key]);
  const num = (key: string, fallback: number) => {
    const raw = get(key);
    if (raw === undefined || raw === null || raw === "") return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : NaN;
  };
  const sep = get("separator");
  return {
    widthMm: num("widthMm", DEFAULT_LABEL.widthMm),
    heightMm: num("heightMm", DEFAULT_LABEL.heightMm),
    scratchWidthMm: num("scratchWidthMm", DEFAULT_LABEL.scratchWidthMm),
    scratchHeightMm: num("scratchHeightMm", DEFAULT_LABEL.scratchHeightMm),
    scratchTopMm: num("scratchTopMm", DEFAULT_LABEL.scratchTopMm),
    scratchPaddingMm: num("scratchPaddingMm", DEFAULT_LABEL.scratchPaddingMm),
    separator: sep === " " || sep === "" || sep === "-" ? sep : DEFAULT_LABEL.separator,
  };
}

export function pdfResponse(pdf: string, filename: string, extra: Record<string, string> = {}): NextResponse {
  return new NextResponse(Buffer.from(pdf, "latin1"), {
    status: 200,
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "no-store", ...extra },
  });
}
