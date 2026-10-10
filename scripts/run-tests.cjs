/**
 * Runs the whole test chain one command at a time. `npm test` joins ~220 commands with && and fails on Windows ("command line too long");
 * this reads the same pretest and test scripts from package.json, runs each, and lists every failure instead of stopping at the first.
 * Usage: npm run test:run
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
if (process.argv[2]) process.chdir(process.argv[2]);
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const cmds = [...pkg.scripts.pretest.split("&&"), ...pkg.scripts.test.split("&&")].map((c) => c.trim()).filter(Boolean);
const failed = [];
let n = 0;
for (const c of cmds) {
  const r = spawnSync(c, { shell: true, encoding: "utf8", timeout: 180000 });
  n++;
  if (r.status !== 0) { failed.push(c.replace("npx tsx ", "")); console.log("FAIL", c, "\n", (r.stdout + r.stderr).split("\n").slice(-6).join("\n")); }
}
console.log(`ran ${n}, failed ${failed.length}`);
console.log(failed.join("\n"));
