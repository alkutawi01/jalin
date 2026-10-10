/**
 * Shared pieces of the reader account endpoints (/api/akaun/*): the on/off switch, the cookie, the same-origin check, the visitor's
 * address, and one place that builds the keyed-hash key and the mailer. Nothing here reads the database.
 */
import { NextResponse } from "next/server";
import { getDb } from "../db";
import { readerAccountsEnabled } from "./enabled";
import { getSession, type SessionInfo } from "./service";
import { ipMac, loadCodeKey, loadMacKey, loadPreviousCodeKeys, selectMailer, type MacKey, type Mailer } from "./primitives";

export { readerAccountsEnabled };

export function notFoundWhenOff(): NextResponse | null {
  return readerAccountsEnabled() ? null : NextResponse.json({ error: "Tidak dijumpai." }, { status: 404 });
}

/** __Host- needs HTTPS (Secure), so local work over http uses a plain name. */
export function readerCookieName(env: Record<string, string | undefined> = process.env): string {
  return env.NODE_ENV === "production" ? "__Host-jalin-reader" : "jalin-reader";
}

const COOKIE_MAX_AGE_SECONDS = 400 * 24 * 60 * 60; // the longest a browser will keep a cookie; the device row, not the cookie, is the authority

export function setReaderCookie(response: NextResponse, token: string): void {
  response.cookies.set(readerCookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export function clearReaderCookie(response: NextResponse): void {
  response.cookies.set(readerCookieName(), "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}

/** A request that changes anything must come from this site itself: its Origin host has to be the host it was sent to. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

let cachedKey: MacKey | null = null;
export function macKey(): MacKey {
  return (cachedKey ??= loadMacKey());
}
let cachedCodeKey: MacKey | null = null;
export function codeKey(): MacKey {
  return (cachedCodeKey ??= loadCodeKey());
}
let cachedPreviousCodeKeys: MacKey[] | null = null;
export function previousCodeKeys(): MacKey[] {
  return (cachedPreviousCodeKeys ??= loadPreviousCodeKeys());
}
let cachedMailer: Mailer | null = null;
export function mailer(): Mailer {
  return (cachedMailer ??= selectMailer());
}

export const visitorMac = (request: Request) => ipMac(macKey(), clientIp(request));

export function readerTokenFrom(request: Request): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const name = readerCookieName();
  for (const part of header.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName === name) return rest.join("=") || null;
  }
  return null;
}

export async function currentSession(request: Request): Promise<{ token: string; session: SessionInfo } | null> {
  const token = readerTokenFrom(request);
  if (!token) return null;
  const session = await getSession(getDb(), token);
  return session ? { token, session } : null;
}

export function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

/** Reads a small JSON body; anything else (too large, not JSON, not an object) is an empty object, so callers see missing fields. */
export async function readJson(request: Request, maxBytes = 4096): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (text.length > maxBytes) return {};
    const value = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export const asString = (value: unknown, max = 320): string => (typeof value === "string" ? value.slice(0, max) : "");
