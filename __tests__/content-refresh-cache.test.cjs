// Run: node __tests__/content-refresh-cache.test.cjs (requires dev dependencies).
// Exercise the actual factory with a controlled clock and repository doubles.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

let now = 0;
let loads = 0;
let fail = false;
class DatabaseContentRepository {
  isEnabled() { return true; }
  async init() {
    loads++;
    await Promise.resolve();
    if (fail) throw new Error('simulated DB outage');
  }
}
class MarkdownContentRepository {}
const source = fs.readFileSync(path.join(__dirname, '../src/lib/content/repository-factory.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exportsObject = {};
vm.runInNewContext(compiled, {
  exports: exportsObject,
  require: (name) => {
    if (name === './database-repository') return { DatabaseContentRepository };
    if (name === './markdown-repository') return { MarkdownContentRepository };
    throw new Error(`Unexpected import: ${name}`);
  },
  process: { env: { CONTENT_SOURCE: 'database' } },
  Date: { now: () => now },
  console: { log() {}, warn() {}, error() {} },
});

(async () => {
  const { initContentRepository, resetContentRepository } = exportsObject;
  const initial = await initContentRepository();
  assert.equal(loads, 1);
  for (now of [30_001, 60_001, 299_999, 300_000]) {
    assert.equal(await initContentRepository(), initial);
    assert.equal(loads, 1, 'Corpus must remain cached for five minutes');
  }
  now = 300_001;
  const results = await Promise.all([initContentRepository(), initContentRepository(), initContentRepository()]);
  assert.equal(loads, 2, 'Concurrent refreshes share one load');
  assert.equal(results[0], results[1]);
  assert.notEqual(results[0], initial);
  now += 300_001;
  fail = true;
  assert.equal(await initContentRepository(), results[0], 'An outage keeps the last good content');
  fail = false;
  const recovered = await initContentRepository();
  assert.notEqual(recovered, results[0], 'A failed refresh remains retryable');
  resetContentRepository();
  assert.notEqual(await initContentRepository(), recovered, 'Explicit reset reloads immediately');
  console.log('PASS: five-minute reuse, concurrent refresh, outage fallback, recovery and explicit reset');
})().catch((error) => { console.error(error); process.exitCode = 1; });
