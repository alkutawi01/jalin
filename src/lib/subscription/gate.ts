/**
 * Who may read the full text of a work (the paywall rule, pure). Everyone may log in; only an active trial or subscription reads.
 *
 *   open         the text is shown (the paywall is off, the work is a sample, or the reader has access)
 *   sign_in      a visitor who has not signed in
 *   start_trial  signed in, no access yet, and the free trial can still be started on this account
 *   subscribe    signed in, no access (trial over or never available): redeem a code
 */
export type GateState = "open" | "sign_in" | "start_trial" | "subscribe";

export type GateInput = {
  /** Reader accounts are on AND the paywall switch is on. */
  paywallOn: boolean;
  isSample: boolean;
  signedIn: boolean;
  /** "trial" or "subscribed" read; "expired" and "none" do not. */
  accessState: "trial" | "subscribed" | "expired" | "none" | null;
  trialAvailable: boolean;
};

export function decideGate(input: GateInput): GateState {
  if (!input.paywallOn || input.isSample) return "open";
  if (!input.signedIn) return "sign_in";
  if (input.accessState === "trial" || input.accessState === "subscribed") return "open";
  return input.trialAvailable ? "start_trial" : "subscribe";
}
