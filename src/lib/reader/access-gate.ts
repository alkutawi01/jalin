/**
 * The paywall at the server, before anything is sent to the browser. One answer for every route that would show a work's text:
 * who is looking (the cookie), whether the work is a sample, and whether the paywall is on. The text is never handed to a
 * component that has not passed this: a locked page is given only a title, a dek, a picture and names.
 */
import { getDb } from "../db";
import { readerAccountsEnabled } from "../reader-auth/enabled";
import { getAccess } from "../reader-auth/entitlements";
import { macKey } from "../reader-auth/http";
import { currentReaderSession } from "../reader-auth/server";
import { canStartTrial } from "../reader-auth/service";
import { paywallOn, sampleSlugs } from "../reader-auth/switches";
import { decideGate, type GateState } from "../subscription/gate";

export type Gate = { state: GateState; signedIn: boolean; email: string | null };

/** The gate for one work, by its slug. */
export async function gateForWork(slug: string): Promise<Gate> {
  // With accounts off nothing is locked, and the page must not need the database for this.
  if (!readerAccountsEnabled()) return { state: "open", signedIn: false, email: null };
  const db = getDb();
  if (!(await paywallOn(db))) return { state: "open", signedIn: false, email: null };
  const samples = await sampleSlugs(db);
  if (samples.has(slug)) return { state: "open", signedIn: false, email: null };
  const session = await currentReaderSession();
  if (!session) return { state: "sign_in", signedIn: false, email: null };
  const access = await getAccess(db, session.account.id);
  const state = decideGate({
    paywallOn: true,
    isSample: false,
    signedIn: true,
    accessState: access.state,
    trialAvailable: access.state === "none" ? await canStartTrial(db, { key: macKey() }, session.account.id) : false,
  });
  return { state, signedIn: true, email: session.account.email };
}

/** For lists and search: what this viewer may read in full. */
export type ViewerReach = { all: boolean; samples: Set<string> };

export async function viewerReach(): Promise<ViewerReach> {
  if (!readerAccountsEnabled()) return { all: true, samples: new Set() };
  const db = getDb();
  if (!(await paywallOn(db))) return { all: true, samples: new Set() };
  const samples = await sampleSlugs(db);
  const session = await currentReaderSession();
  if (!session) return { all: false, samples };
  const access = await getAccess(db, session.account.id);
  return { all: access.state === "trial" || access.state === "subscribed", samples };
}
