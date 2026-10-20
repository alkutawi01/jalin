/** Arabic in a story: runs are set apart as Arabic (language, direction, class), a verse on its own line is a block, and Malay text is untouched. */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";
import { arabicChildren, hasArabic, isArabicOnly, wrapArabic } from "../src/lib/reader/arabic-text";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string, detail?: unknown) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`, detail ?? ""); }
}
const html = (nodes: React.ReactNode) => renderToStaticMarkup(<>{nodes}</>);

assert(!hasArabic("Dia membaca surah itu dengan perlahan."), "Malay text has no Arabic");
assert(hasArabic("Allah berfirman: ٱلْحَمْدُ لِلَّهِ"), "text with a verse has Arabic");
assert(html(wrapArabic("Dia pulang.")) === "Dia pulang.", "Malay text is returned as it is");

const one = html(wrapArabic("Dia membaca بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ sebelum bermula."));
assert(one.includes('<span class="arabic" lang="ar" dir="rtl">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</span>'), "a phrase of Arabic words is one run, with its spaces", one);
assert(one.startsWith("Dia membaca ") && one.endsWith(" sebelum bermula."), "the Malay around it is untouched", one);

const two = html(wrapArabic("“الأمير عبد القادر” dan عصور (Asour)"));
assert((two.match(/class="arabic"/g) ?? []).length === 2, "two separate runs are two spans", two);
assert(two.includes("(Asour)") && !two.includes('arabic" lang="ar" dir="rtl">عصور (Asour'), "Latin letters are not swallowed into the run", two);

const dated = html(wrapArabic("1856م-1860م"));
assert(dated.includes(">م-1860م<"), "digits and a hyphen between Arabic letters stay inside the run", dated);

assert(isArabicOnly("﴿ ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَـٰلَمِينَ ﴾"), "a verse in ornate brackets on its own is Arabic only");
assert(isArabicOnly("وَالْعَصْرِ ﴿١﴾"), "a verse with its number is Arabic only");
assert(isArabicOnly("وَالْعَصْرِ ۝١"), "a verse with the circle mark is Arabic only");
assert(isArabicOnly("وَالْعَصْرِ (1) {2}"), "a verse with written-out marks is Arabic only");
assert(!isArabicOnly("Allah berfirman: ٱلْحَمْدُ لِلَّهِ"), "a sentence with Malay is not Arabic only");
assert(!isArabicOnly(""), "empty text is not Arabic only");
assert(!isArabicOnly("1856"), "numbers alone are not Arabic only");

const tree = html(arabicChildren(<>Dia berkata <em>demikian</em> dengan <strong>الحمد لله</strong>.</>));
assert(tree.includes('<strong><span class="arabic" lang="ar" dir="rtl">الحمد لله</span></strong>'), "Arabic inside emphasis is wrapped inside it", tree);
assert(tree.includes("<em>demikian</em>"), "other emphasis is left as it is", tree);
const again = html(arabicChildren(<span className="arabic">الله</span>));
assert(again === '<span class="arabic">الله</span>', "an element already set as Arabic is not wrapped twice", again);

// Through the real reader: a verse alone on a line is a block, a verse inside a sentence is a run, Malay is untouched.
const story = renderToStaticMarkup(<StoryMarkdown glossary={{}}>{"Dia membaca ٱلْحَمْدُ لِلَّهِ dengan perlahan.\n\n﴿ وَٱلْعَصْرِ ﴿١﴾ إِنَّ ٱلْإِنسَـٰنَ لَفِى خُسْرٍ ﴾\n\nSelesai."}</StoryMarkdown>);
assert(story.includes('<p class="arabic-block" lang="ar" dir="rtl">'), "a verse alone on a line is a right-to-left block", story);
assert(story.includes('<span class="arabic" lang="ar" dir="rtl">ٱلْحَمْدُ لِلَّهِ</span>'), "a verse inside a sentence is an inline run", story);
assert(story.includes("<p>Selesai.</p>"), "a Malay paragraph is untouched", story);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
