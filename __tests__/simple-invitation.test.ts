/**
 * Izzat, 9 Okt 2026: inviting someone must not need their full name, e-mail or a username the owner has to invent ("all I have is their
 * WhatsApp"). The system makes a temporary username and password and a ready invitation; the owner chooses the role, copies the text and
 * sends it any way they like. The person gives their own name and a lasting username when they first sign in, and a temporary password
 * nobody used within a week stops working.
 */
import fs from "node:fs";
import path from "node:path";
import { DEFAULT_DISPLAY_NAME, INVITE_VALID_DAYS, cleanUsername, generateTempUsername, inviteExpired, inviteExpiry, invitationText } from "../src/lib/admin/user-service";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// The temporary username
const names = Array.from({ length: 200 }, generateTempUsername);
assert(names.every((n) => /^jalin-[a-hj-km-np-z2-9]{5}$/.test(n)) && names.every((n) => cleanUsername(n) === n), "a made-up username is jalin- and five easy characters, and passes the username rules");
assert(!names.some((n) => /[0oil1]/.test(n.slice(6))) && new Set(names).size > 190, "it has no look-alike characters and is not repeated");

// The invitation
const text = invitationText({ username: "jalin-k7m2x", role: "editor" }, "Kp4t-Xm9w-Rb2n", "https://jalin.adjung.com");
assert(text.startsWith("Assalamualaikum warahmatullah wabarakatuh.") && text.includes("menyertai Jalin sebagai penyunting"), "the invitation greets and names the role");
assert(text.includes("Kata nama sementara: jalin-k7m2x") && text.includes("Kata laluan sementara: Kp4t-Xm9w-Rb2n") && text.includes("https://jalin.adjung.com/admin/login"), "the username, password and address are filled in");
assert(text.includes("menukar kata nama dan kata laluan kekal selepas mendaftar masuk") && text.includes(`${INVITE_VALID_DAYS} hari`), "it says the name and password can be changed after signing in, and for how long it is valid");
assert(!text.includes("Salam undefined") && !text.includes("{"), "it has no gaps left to fill");

// Expiry
const day = 86_400_000;
const issued = new Date("2026-10-01T00:00:00Z").toISOString();
const unused = { mustChangePassword: true, lastLoginAt: null, updatedAt: issued };
assert(inviteExpiry(unused)!.toISOString() === new Date(new Date(issued).getTime() + INVITE_VALID_DAYS * day).toISOString(), "an unused invitation ends seven days after the owner last set it");
assert(!inviteExpired(unused, new Date(issued).getTime() + 6 * day) && inviteExpired(unused, new Date(issued).getTime() + 8 * day), "it works on day 6 and not on day 8");
assert(!inviteExpired({ ...unused, lastLoginAt: issued }, new Date(issued).getTime() + 30 * day) && inviteExpiry({ ...unused, lastLoginAt: issued }) === null, "an account that has signed in never expires this way");
assert(!inviteExpired({ ...unused, mustChangePassword: false }, new Date(issued).getTime() + 30 * day) && inviteExpiry({ ...unused, updatedAt: null }) === null && inviteExpiry({ ...unused, updatedAt: "bukan tarikh" }) === null, "a chosen password, or a missing or damaged date, is never treated as expired");
assert(DEFAULT_DISPLAY_NAME === "Pengguna baharu", "an account with no note is called Pengguna baharu until the person types their own name");

// The service and the screens
const service = read("src/lib/admin/user-service.ts");
assert(service.includes("input: { username?: unknown; displayName?: unknown; email?: unknown; role: unknown }") && service.includes("generateTempUsername()") && service.includes("attempt < (fixedUsername ? 1 : 8)"), "creating an account needs only the role; a made-up username is tried again if it clashes");
assert(service.includes('reason: "expired"') && service.includes("inviteExpired({"), "signing in with an invitation that ran out is refused with its own reason");
assert(service.includes("if (row.must_change_password && profile)") && service.includes("Nama anda diperlukan"), "name, username and e-mail are taken only at the first sign-in, and the name is required");
assert(read("src/app/api/admin/auth/login/route.ts").includes('outcome.error === "expired"') && read("src/app/api/admin/auth/login/route.ts").includes("Jemputan ini telah tamat tempoh"), "the person is told the invitation ran out and to ask for a new one");

const panel = read("src/app/admin/pengguna/UsersPanel.tsx");
assert(!panel.includes('id="u-name"') && !panel.includes('id="u-username"') && !panel.includes('id="u-email"') && panel.includes('id="u-role"') && panel.includes('id="u-note"'), "the form asks for the role and an optional note, nothing else");
assert(panel.includes('"Sediakan jemputan"') && panel.includes("displayName: form.note") && panel.includes("onChange={(e) => setInvitation({ ...invitation, text: e.target.value })}"), "one button prepares the invitation, and its text can be changed before it is copied");
assert(panel.includes("Hantar jemputan semula") && panel.includes("jemputan tamat tempoh") && panel.includes("menunggu log masuk pertama"), "the list shows an invitation waiting, ran out, and how to send a new one");

const form = read("src/app/admin/ubah-kata-laluan/ChangePasswordForm.tsx");
assert(form.includes('id="displayName"') && form.includes('id="username"') && form.includes('id="email"') && form.includes("firstTime ? { current, next, displayName, username, email } : { current, next }"), "the first sign-in asks for the person's name, a lasting username and an optional e-mail with the new password");
assert(read("src/app/admin/ubah-kata-laluan/page.tsx").includes("user?.mustChangePassword") && !form.includes("setDisplayName(initial"), "the form knows it is the first sign-in, and does not show the owner's private note as the name");
assert(read("src/app/api/admin/auth/change-password/route.ts").includes("{ username: body.username, displayName: body.displayName, email: body.email }"), "the route passes them on");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
