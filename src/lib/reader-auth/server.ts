import { cookies } from "next/headers";
import { getDb } from "../db";
import { readerAccountsEnabled, readerCookieName } from "./http";
import { getSession, type SessionInfo } from "./service";

/** For server-rendered pages: who is signed in, from the cookie of this request. Null when the feature is off or nobody is signed in. */
export async function currentReaderSession(): Promise<SessionInfo | null> {
  if (!readerAccountsEnabled()) return null;
  const token = (await cookies()).get(readerCookieName())?.value;
  if (!token) return null;
  return getSession(getDb(), token);
}
