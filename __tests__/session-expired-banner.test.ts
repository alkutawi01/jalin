/**
 * Found in the 8 Okt simulation: when the session ends under an open page, a save only shows the sentence "Sesi anda telah tamat.
 * Log masuk semula." with no way on from it, and nothing says the typed text is still there. The admin shell now raises a banner with a
 * link to sign in again in a new tab.
 */
import fs from "node:fs";
import path from "node:path";
import { isSessionExpiredAnswer, SESSION_BANNER } from "../src/lib/admin/session-expiry";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

assert(isSessionExpiredAnswer("/api/admin/works/abc", 401), "a 401 from the admin API means the session ended");
assert(isSessionExpiredAnswer("http://localhost:3210/api/admin/credits?workId=1", 401) && isSessionExpiredAnswer("https://jalin.adjung.com/api/admin/works/x", 401), "a full address works the same");
assert(!isSessionExpiredAnswer("/api/admin/works/abc", 403) && !isSessionExpiredAnswer("/api/admin/works/abc", 200) && !isSessionExpiredAnswer("/api/admin/works/abc", 500), "only 401 counts (403 is 'not allowed', not 'signed out')");
assert(!isSessionExpiredAnswer("/api/admin/auth/login", 401), "a wrong password at sign-in is also a 401 but is not an ended session");
assert(!isSessionExpiredAnswer("/api/admin/auth/change-password", 401), "nor is a wrong current password when choosing a new one");
assert(!isSessionExpiredAnswer("/api/cari/cadangan", 401) && !isSessionExpiredAnswer("/api/koleksi-cerita", 401), "calls outside the admin API are ignored");
assert(!isSessionExpiredAnswer("not a url at all", 401), "an odd address does not throw or match");

assert(SESSION_BANNER.title === "Sesi anda telah tamat." && /masih ada pada halaman ini/.test(SESSION_BANNER.body) && SESSION_BANNER.link === "Log masuk semula", "the banner says what happened, that the typing is safe, and how to go on");

const shell = read("src/components/admin/AdminShell.tsx");
assert(shell.includes("window.fetch = async") && shell.includes("window.fetch = original") && shell.includes("isSessionExpiredAnswer(url, response.status)"), "the shell watches its own API answers and puts fetch back when it goes away");
assert(shell.includes('href="/admin/login" target="_blank" rel="noopener"') && shell.includes('role="alert"'), "the link opens a new tab (the open page keeps what was typed) and the banner is announced");
assert(shell.indexOf("useEffect(() => {\n    const original = window.fetch") < shell.indexOf('if (pathname.startsWith("/admin/login")'), "the watcher is set up before the early return (hooks run in the same order every time)");
assert(/try \{[^]*isSessionExpiredAnswer[^]*\} catch/.test(shell), "a problem in the banner never breaks a request");
assert(read("src/app/admin/admin.css").includes(".a-shell .a-session-banner"), "the banner is styled");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
