import { NextResponse } from "next/server";
import { getDb } from "../../../../lib/db";
import { currentSession, noStore, notFoundWhenOff } from "../../../../lib/reader-auth/http";
import { listDevices } from "../../../../lib/reader-auth/service";
import { getAccess } from "../../../../lib/reader-auth/entitlements";

export const dynamic = "force-dynamic";

/** Who is signed in on this device, and the devices that account has. Never cached. */
export async function GET(request: Request) {
  const off = notFoundWhenOff();
  if (off) return off;
  const current = await currentSession(request);
  if (!current) return noStore(NextResponse.json({ signedIn: false }));
  const devices = await listDevices(getDb(), current.session.account.id);
  const access = await getAccess(getDb(), current.session.account.id);
  const { account } = current.session;
  return noStore(
    NextResponse.json({
      signedIn: true,
      account: { email: account.email, displayName: account.displayName, trialStartsAt: account.trialStartsAt, trialEndsAt: account.trialEndsAt },
      access: { state: access.state, endsAt: access.endsAt, currentPeriodEndsAt: access.currentPeriodEndsAt },
      thisDeviceId: current.session.device.id,
      devices,
    })
  );
}
