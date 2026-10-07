/** Jalin motifs in the site: the emblem (loader, 404, empty state), and the story-end divider. */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const emblem = read("src/components/reader/JalinEmblem.tsx");
const logo = read("public/brand/jalin-icon-color.svg");
assert((emblem.match(/"fill":/g) ?? []).length === 9 && (logo.match(/<path/g) ?? []).length === 9, "the emblem has the nine blades of the logo file");
assert(["rgb(19,47,56)", "rgb(215,174,150)", "rgb(169,93,70)"].every((c) => emblem.includes(c)), "the emblem keeps the logo's own colours");

const css = read("src/app/globals.css");
assert(css.includes(".jalin-emblem.is-live.v-tenun .jalin-blade { animation: jalin-tenun") && css.includes(".jalin-emblem.is-live.v-gelombang .jalin-blade { animation: jalin-gelombang"), "only a live emblem animates");
assert(/prefers-reduced-motion: reduce\) \{ \.jalin-emblem\.is-live \.jalin-blade, \.jalin-emblem\.is-live svg \{ animation: none; \}/.test(css), "no motion under prefers-reduced-motion");
assert(css.includes(".page-loading { position: fixed; inset: 0; z-index: 200; display: grid; place-items: center; background: #18343c; animation: jalin-muncul .01s linear .35s both; }"), "the route loading screen is the theme's deep teal and waits before appearing");
const boot = read("src/components/reader/BootScreen.tsx");
assert(boot.includes("1000-performance.now()") && boot.includes("setTimeout(out,8000)") && /readyState/.test(boot), "every page shows the loading screen for at least one second, and for as long as the page takes (8 seconds at most)");
assert(boot.includes("classList.add(\"boot-out\")") && !/removeChild|.remove()/.test(boot.split("const SCRIPT")[1]!.split("export default")[0]!), "the script only adds a class, so the page still hydrates cleanly");
// Without JavaScript the streamed page (it arrives inside hidden boxes, id "S:…", that a script moves into place) must still be seen:
// before this, a reader with no script saw only the emblem of the loading screen, for ever.
assert(boot.includes('.boot-screen,.page-loading{display:none!important}') && boot.includes('div[hidden][id^="S:"]{display:block!important}') && boot.includes("<noscript><style>{NOSCRIPT_CSS}</style></noscript>"), "without JavaScript both loading screens are off and the streamed page is shown");
assert(read("src/app/layout.tsx").includes("<BootScreen />") && css.includes("body:has(.a-nav, .admin-login-page) .boot-screen { display: none; }") && boot.includes("<noscript>"), "it is in every page, and not in the admin or without JavaScript");

assert(read("src/app/not-found.tsx").includes("<JalinEmblem animated"), "the 404 page shows the moving emblem");
// A root loading.tsx makes every page stream behind it, and a streamed page has already answered 200 when it finds the work does not
// exist: every missing address was a "soft 404" (200) to search engines. The loading screen readers see is the BootScreen above.
assert(!fs.existsSync(path.join(__dirname, "..", "src/app/loading.tsx")), "no root loading file, so a page that does not exist answers 404");
assert(read("src/app/kategori/[type]/page.tsx").includes("<JalinEmblem size={72} />"), "an empty category shows the still emblem");

assert(read("src/components/reader/StoryChrome.tsx").includes('<div className="end-rule"><LilitDivider /></div>'), "the end of a story shows the Lilit Naskhah divider");
const lilit = read("src/components/reader/LilitDivider.tsx");
assert(lilit.includes('className="lilit-gap"') && css.includes(".lilit-divider .lilit-gap { stroke: var(--paper); }"), "the over strand sits on a paper-coloured gap, so no mask is needed");

assert(!css.includes(".site-footer::before"), "the footer has no pattern band along its top edge (Izzat found it unattractive, 7 Oct 2026)");

assert(css.includes("html:has(.boot-screen:not(.boot-out)):not(:has(.a-nav, .admin-login-page)) { overflow: hidden;") && css.includes("@keyframes boot-unlock") && css.includes("html:has(.a-nav, .admin-login-page) { overflow: visible; }"), "the page behind the loading screen has no scroll bar and does not scroll (never in the admin, even if boot-out is missing; a public page lets go after 8.5s if the script never ran)");
assert(css.includes(".work-cover img { animation: jalin-fade-in .3s ease-out; }") && !/\.hero-featured-visual img \{ animation: jalin-fade-in/.test(css), "the home hero picture runs no fade of its own; cards keep theirs");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
