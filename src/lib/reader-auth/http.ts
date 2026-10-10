/**
 * Shared pieces of the reader account endpoints (/api/akaun/*): the on/off switch, the cookie, the same-origin check, the visitor's
 * address, and one place that builds the keyed-hash key and the mailer. Nothing here reads the database.
 */
import { NextResponse } from "next/server";
import { isIP } from "node:net";
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

export function rateLimitIp(address: string): string {
  let ip = address.trim();
  if (ip.startsWith("[") && ip.endsWith("]")) ip = ip.slice(1, -1);
  if (isIP(ip) !== 6) return ip;
  // A /64 is the practical identity of an IPv6 visitor; rotating interface IDs must not reset the limit.
  const dotted = /(?:^|:)(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u.exec(ip);
  if (dotted) {
    const bytes = dotted.slice(1).map(Number);
    ip = ip.slice(0, dotted.index + (ip[dotted.index] === ":" ? 1 : 0)) + `${((bytes[0] << 8) | bytes[1]).toString(16)}:${((bytes[2] << 8) | bytes[3]).toString(16)}`;
  }
  const halves = ip.split("::");
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const words = halves.length === 2 ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right] : left;
  return words.slice(0, 4).map((part) => Number.parseInt(part, 16).toString(16).padStart(4, "0")).join(":") + "::/64";
}

export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real) return rateLimitIp(real);
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return rateLimitIp(forwarded.split(",")[0]);
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
