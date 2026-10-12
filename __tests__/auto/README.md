# Tests found by file name

Put a new `*.test.ts` here and `npm test` runs it (via `scripts/run-auto-tests.cjs`); there is no need to edit `package.json`,
whose single `test` line used to conflict between every two open pull requests.
Same conventions as the other tests: `assert(cond, msg)`, a summary line, `process.exit(failed ? 1 : 0)`.
