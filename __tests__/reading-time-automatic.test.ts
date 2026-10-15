import assert from "node:assert/strict";
import { readingMinutesFor, readingWordCount } from "../src/lib/reader/reading-time";
import { workFromSnapshot } from "../src/lib/content/database-repository";

const words = (n: number) => "kata ".repeat(n);
for (const type of ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"]) {
  const work = workFromSnapshot({ id: "test", slug: "test", title: "Ujian", type, body: words(1000), readingMinutes: 99 }, "test");
  assert.equal(work?.readingMinutes, 5, `${type}: ignores old manual minutes`);
}
const novela = workFromSnapshot({ type: "novela", body: words(200), sections: [{ body: words(400), readingMinutes: 80 }, { body: words(600), readingMinutes: 90 }] }, "novela");
assert.equal(novela?.readingMinutes, 6, "preface plus all chapters, not rounded chapter totals");
assert.equal(novela?.sections?.[0].readingMinutes, 2, "chapter time is calculated separately");
assert.equal(readingMinutesFor(99, ""), undefined);
assert.equal(readingMinutesFor(99, words(200)), 1);
assert.equal(readingMinutesFor(99, words(800)), 4, "updates when manuscript length changes");
assert.equal(readingWordCount("**kata** *dua* [tiga](https://example.com) ![gambar lama](https://image.test/file.png) <!-- komen sulit -->"), 3);
assert.equal(readingWordCount("anak-anak di rumah"), 3);
console.log("Automatic reading time: all five types, chapters, empty text, edits and Markdown passed");
