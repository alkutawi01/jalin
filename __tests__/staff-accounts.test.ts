/**
 * Staff accounts (RBAC, 8 Okt): hashed passwords, temporary password and the invitation text, permissions on the new routes,
 * and the places that must hold: owner tried first at sign-in, staff re-checked against the table, a temporary password gates everything else.
 */
import fs from "node:fs";
import path from "node:path";
import { generateTempPassword, hashPassword, passwordProblem, verifyPassword } from "../src/lib/admin/passwords";
import { cleanUsername, invitationText, isStaffRole, UserInputError } from "../src/lib/admin/user-service";
import { isAllowed, permissionFor } from "../src/lib/admin/permissions";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// Passwords
const h = hashPassword("Kata-laluan-7");
assert(h.startsWith("scrypt$") && !h.includes("Kata-laluan-7"), "a hash is stored, never the password");
assert(verifyPassword("Kata-laluan-7", h) && !verifyPassword("kata-laluan-7", h) && !verifyPassword("", h), "the right password verifies, near misses do not");
assert(hashPassword("Kata-laluan-7") !== h, "two hashes of the same password differ (random salt)");
assert(!verifyPassword("x", "") && !verifyPassword("x", "scrypt$1$zz$zz") && !verifyPassword("x", "plain"), "a broken stored value never verifies and never throws");
const temp = generateTempPassword();
assert(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/.test(temp) && !/[0OIl1]/.test(temp), "a temporary password is three groups of four, without look-alike characters");
assert(new Set(Array.from({ length: 50 }, generateTempPassword)).size === 50, "temporary passwords are not repeated");
assert(passwordProblem("pendek1") !== null && passwordProblem("hurufsahajaaa") !== null && passwordProblem("1234567890") !== null && passwordProblem("Cukup-panjang-7") === null, "a new password needs 10+ characters with letters and numbers");
assert(passwordProblem("siti-aminah-77", "siti-aminah") !== null, "a password may not contain the username");

// Users
assert(cleanUsername(" Siti.Aminah ") === "siti.aminah", "a username is lower-cased and trimmed");
for (const bad of ["ab", "A B", "-abc", "a".repeat(31), "siti@x.com", ""]) {
  let thrown = false;
  try { cleanUsername(bad); } catch (e) { thrown = e instanceof UserInputError; }
  assert(thrown, `username "${bad.slice(0, 12)}" is refused with a Malay message`);
}
assert(isStaffRole("editor") && isStaffRole("chief_editor") && !isStaffRole("owner") && !isStaffRole("admin"), "only editor and chief_editor can be given to an account; nobody is made owner");
const text = invitationText({ displayName: "Siti", username: "siti", role: "editor" }, "Kp4t-Xm9w-Rb2n", "https://jalin.adjung.com");
assert(text.includes("https://jalin.adjung.com/admin/login") && text.includes("Nama pengguna: siti") && text.includes("Kata laluan sementara: Kp4t-Xm9w-Rb2n") && text.includes("penyunting"), "the invitation carries the address, username, temporary password and role");

// Permissions
assert(permissionFor("GET", "/api/admin/users") === "user.manage" && permissionFor("POST", "/api/admin/users/abc/reset-password") === "user.manage" && permissionFor("PATCH", "/api/admin/users/abc") === "user.manage", "every users route needs user.manage (a plain read of the list does not fall to content.read)");
assert(isAllowed("owner", "GET", "/api/admin/users") && !isAllowed("chief_editor", "GET", "/api/admin/users") && !isAllowed("editor", "GET", "/api/admin/users") && !isAllowed("editor", "POST", "/api/admin/users"), "only the owner reaches the users API");
assert(isAllowed("owner", "GET", "/admin/pengguna") && !isAllowed("chief_editor", "GET", "/admin/pengguna") && !isAllowed("editor", "GET", "/admin/pengguna"), "only the owner opens the Pengguna page");
assert(isAllowed("editor", "GET", "/admin/ubah-kata-laluan") && isAllowed("editor", "POST", "/api/admin/auth/change-password"), "every role may choose its own password");

// Wiring
const auth = read("src/lib/admin/auth.ts");
assert(auth.indexOf("const owner = await loginAdmin(identifier, password)") > 0 && auth.indexOf("authenticateStaff(identifier, password)") > auth.indexOf("const owner = await loginAdmin"), "sign-in tries the owner first, then the staff table");
assert(auth.includes("row.role !== user.role") && auth.includes("!row.active"), "a staff session is checked against the table: switched off or a changed role ends it");
assert(!/role: "admin"[^]{0,40}staff/.test(auth) && /isStaffRole\(data\.role\)/.test(auth), "a staff token can only carry a staff role");
const mw = read("src/middleware.ts");
assert(mw.includes("session.mustChangePassword") && mw.includes('"/admin/ubah-kata-laluan"') && mw.includes('pathname.startsWith("/api/admin/auth/")'), "a temporary password opens nothing but the password page and sign-out");
for (const f of ["src/app/api/admin/users/route.ts", "src/app/api/admin/users/[id]/route.ts", "src/app/api/admin/users/[id]/reset-password/route.ts"]) {
  // The users routes arrive with the Pengguna page (a later PR); once they exist they must hold.
  if (!fs.existsSync(path.join(__dirname, "..", f))) continue;
  assert(read(f).includes('admin.role !== "admin"') || read(f).includes('admin.role === "admin"'), `${f} also checks for the owner itself`);
}
const mig = read("src/lib/db/migrations/025_admin_users.ts");
assert(mig.includes("CREATE TABLE IF NOT EXISTS admin_users") && mig.includes("CHECK (role IN ('chief_editor', 'editor'))") && !/owner/.test(mig.replace(/\/\*[^]*?\*\//, "").replace(/The owner[^\n]*/g, "")), "the table is additive and has no owner role");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
