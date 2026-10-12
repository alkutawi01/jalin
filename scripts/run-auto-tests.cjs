/**
 * Runs every __tests__/auto/*.test.ts (and .test.tsx) on its own, so a new test needs no edit of package.json.
 *
 * The "test" script of package.json is one very long line of && commands; every pull request that added a test appended to the end of
 * that line, so any two open pull requests conflicted on it each time one of them was merged (it happened four times in one day).
 * A test that lives in __tests__/auto/ is found here by its file name instead. Tests already listed in package.json stay where they are.
 * Usage: node scripts/run-auto-tests.cjs   (from the repository root; also the last step of `npm test`)
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const dir = path.join(root, "__tests__", "auto");
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.test\.tsx?$/.test(f)).sort() : [];
let failed = 0;
for (const file of files) {
  const args = ["tsx", ...(file.endsWith(".tsx") ? ["--tsconfig", "tsconfig.test.json"] : []), path.join("__tests__", "auto", file)];
  const run = spawnSync("npx", args, { cwd: root, shell: true, encoding: "utf8", timeout: 180000 });
  if (run.status !== 0) {
    failed++;
    console.error(`FAIL ${file}\n${(run.stdout + run.stderr).split("\n").slice(-12).join("\n")}`);
  } else {
    console.log(`ok   ${file}`);
  }
}
console.log(`auto tests: ${files.length - failed} passed, ${failed} failed (${files.length} files)`);
process.exit(failed ? 1 : 0);
