/**
 * The newest episode of a series that is still going on ended with "Tamat", right under a status of "Masih diteruskan".
 * It now ends with "Bersambung"; "Tamat" is for the last episode of a finished series, and for a cerpen or a novela.
 */
import fs from "node:fs";
import path from "node:path";

let passed = 0;
let failed = 0;
function assert(cond: boolean, msg: string) {
  if (cond) { passed++; console.log(`  ✓ ${msg}`); } else { failed++; console.error(`  ✗ ${msg}`); }
}
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

const chrome = read("src/components/reader/StoryChrome.tsx");
assert(chrome.includes('export function StoryEnd({ title, label = "Tamat" }') && chrome.includes("<span>{label}</span>"), "the end mark says Tamat unless it is told otherwise");
const episode = read("src/components/reader/EpisodeView.tsx");
assert(episode.includes('{!nextEpisode ? <StoryEnd title={work.title} label={series.status === "completed" ? "Tamat" : "Bersambung"} /> : null}'), "an episode with a next episode has no end mark; the newest episode says Bersambung while the series goes on, and Tamat when it is finished");
const work = read("src/components/reader/WorkView.tsx");
assert(/<StoryEnd title=\{work\.title\} \/>/.test(work), "a cerpen and the last chapter of a novela still end with Tamat");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
