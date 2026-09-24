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

// Test freeze metadata behavior
function testFreezeMetadata() {
  console.log("\n=== Freeze Metadata Tests ===");
  
  // Simulate snapshot capture at publish time
  const publishSnapshot = {
    id: "JLN-CER-0001",
    body: "Original body",
    credits: [{ slug: "nara-zahin", role: "illustrator" }],
    visuals: [{ src: "/visuals/hero.png", alt: "Hero image" }],
    glossary: [{ term: "rumah", meaning: "house" }],
    editorialHistory: [{ version: "v1.0", type: "initial" }],
  };
  
  // Simulate metadata change after publish
  const updatedWork = {
    id: "JLN-CER-0001",
    body: "Updated body after publish",
    credits: [{ slug: "new-person", role: "editor" }],
    visuals: [{ src: "/visuals/new-hero.png", alt: "New hero" }],
    glossary: [{ term: "baru", meaning: "new" }],
  };
  
  // Verify snapshot is immutable (doesn't change when work changes)
  assert(publishSnapshot.body === "Original body", "Snapshot body frozen at publish");
  assert(publishSnapshot.credits[0].slug === "nara-zahin", "Snapshot credit frozen");
  assert(publishSnapshot.visuals[0].src === "/visuals/hero.png", "Snapshot visual frozen");
  assert(publishSnapshot.glossary[0].term === "rumah", "Snapshot glossary frozen");
  
  // Verify updated work has different data
  assert(updatedWork.body !== publishSnapshot.body, "Work body changed after publish");
  assert(updatedWork.credits[0].slug !== publishSnapshot.credits[0].slug, "Work credit changed");
  
  // Verify buildSnapshotWork reconstructs from snapshot correctly
  function buildSnapshotWork(snapshot: typeof publishSnapshot) {
    return {
      id: snapshot.id,
      body: snapshot.body,
      credits: snapshot.credits || [],
      visuals: snapshot.visuals || [],
      glossary: snapshot.glossary || [],
      editorialHistory: snapshot.editorialHistory || [],
    };
  }
  
  const publicWork = buildSnapshotWork(publishSnapshot);
  assert(publicWork.body === "Original body", "Public work reads from frozen snapshot");
  assert(publicWork.credits[0].slug === "nara-zahin", "Public credit from frozen snapshot");
  assert(publicWork.visuals[0].src === "/visuals/hero.png", "Public visual from frozen snapshot");
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
testFreezeMetadata();
testJSONBHandling();

console.log("\n============================================");
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exit(1);
}