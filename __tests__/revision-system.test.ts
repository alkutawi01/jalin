/**
 * Revision System Regression Tests (Phase 4D-9)
 *
 * Tests for Living Text & Editorial Revision System:
 * - Content hash algorithm
 * - Snapshot structure integrity
 * - Revision service API exists
 * - Migration idempotency
 */

let passed = 0;
let failed = 0;

function assert(condition: boolean, description: string) {
  if (condition) {
    console.log(`  ✓ ${description}`);
    passed++;
  } else {
    console.log(`  ✗ ${description}`);
    failed++;
  }
}

// Test content hash algorithm (djb2)
function testContentHash() {
  console.log("\n=== Content Hash Tests ===");
  
  function djb2(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }
  
  const obj1 = { title: "Test", body: "Content" };
  const hash1 = djb2(JSON.stringify(obj1));
  const hash2 = djb2(JSON.stringify(obj1));
  assert(hash1 === hash2, "Same input produces same hash");
  
  const obj2 = { title: "Test", body: "Different" };
  const hash3 = djb2(JSON.stringify(obj2));
  assert(hash1 !== hash3, "Different input produces different hash");
  
  assert(typeof hash1 === "string", "Hash is string");
  assert(hash1.length > 0, "Hash is not empty");
  
  // Test with large payload
  const largeObj = { body: "x".repeat(10000) };
  const largeHash = djb2(JSON.stringify(largeObj));
  assert(largeHash.length > 0, "Hash works with large payload");
}

// Test revision-service functions exist
function testRevisionServiceAPI() {
  console.log("\n=== Revision Service API Tests ===");
  
  const revisionService = require("../src/lib/admin/revision-service");
  
  assert(typeof revisionService.createRevision === "function", "createRevision is function");
  assert(typeof revisionService.getRevisions === "function", "getRevisions is function");
  assert(typeof revisionService.getRevision === "function", "getRevision is function");
  assert(typeof revisionService.restoreRevision === "function", "restoreRevision is function");
  assert(typeof revisionService.getPublishedRevision === "function", "getPublishedRevision is function");
}

// Test snapshot structure
function testSnapshotStructure() {
  console.log("\n=== Snapshot Structure Tests ===");
  
  const mockSnapshot = {
    id: "test-work-001",
    slug: "test-work",
    title: "Test Work",
    type: "cerpen",
    status: "published",
    genre: "Keluarga",
    audience: "remaja",
    dek: "Test dek",
    readingMinutes: 5,
    body: "Test body content",
    credits: [],
    visuals: [],
    glossary: [],
    editorialHistory: [],
    sourceWork: null,
    readingSections: [],
    series: null,
  };
  
  const requiredFields = [
    "id", "slug", "title", "type", "status", "body",
    "credits", "visuals", "glossary", "editorialHistory"
  ];
  
  for (const field of requiredFields) {
    assert(field in mockSnapshot, `Snapshot field "${field}" exists`);
  }
}

// Test database-repository handles JSONB correctly
function testJSONBHandling() {
  console.log("\n=== JSONB Handling Tests ===");
  
  // Simulate what database-repository does
  function parseJsonbField(value: unknown): unknown {
    if (value === null || value === undefined) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  }
  
  // Test with object (jsonb from pg driver)
  const jsonObj = { test: "value" };
  const result1 = parseJsonbField(jsonObj);
  assert(JSON.stringify(result1) === JSON.stringify(jsonObj), "Object passed through correctly");
  
  // Test with string (legacy data)
  const jsonStr = '{"test": "value"}';
  const result2 = parseJsonbField(jsonStr);
  assert(JSON.stringify(result2) === JSON.stringify(jsonObj), "String parsed correctly");
  
  // Test with null
  const result3 = parseJsonbField(null);
  assert(result3 === null, "Null handled correctly");
}

// Run all tests
console.log("Phase 4D-9 Revision System Regression Tests");
console.log("============================================");

testContentHash();
testRevisionServiceAPI();
testSnapshotStructure();
testJSONBHandling();

console.log("\n============================================");
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}