import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import * as fs from "fs";

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  
  console.log("=== IMPORT WAKTU SEBENAR ===\n");
  
  // 1. Parse manuscript
  const manuscriptPath = "content/manuscripts/Waktu_Sebenar_Structural_Edit_v1.0.txt";
  const content = fs.readFileSync(manuscriptPath, "utf8");
  
  // Split by BAB sections
  const sections: { slug: string; title: string; body: string; position: number }[] = [];
  const lines = content.split("\n");
  let currentSection: { slug: string; title: string; body: string; position: number } | null = null;
  let position = 1;
  
  for (const line of lines) {
    const match = line.match(/^(BAB \d+|EPILOG)/);
    if (match) {
      if (currentSection) {
        sections.push(currentSection);
        position++;
      }
      const title = match[1];
      const slug = title.toLowerCase().replace(/\s+/g, "-");
      currentSection = { slug, title, body: "", position };
    } else if (currentSection) {
      currentSection.body += line + "\n";
    }
  }
  if (currentSection) {
    sections.push(currentSection);
  }
  
  console.log(`1. Parsed ${sections.length} sections from manuscript`);
  
  // Calculate word count and reading time
  const words = content.split(/\s+/).length;
  const readingMinutes = Math.ceil(words / 200);
  console.log(`2. Words: ~${words}, Reading time: ~${readingMinutes} minutes`);
  
  // 2. Update work metadata
  const nowIso = new Date().toISOString();
  
  await db
    .updateTable("works")
    .where("id", "=", "JLN-NOV-9990")
    .set({
      title: "Waktu Sebenar",
      slug: "waktu-sebenar",
      type: "novela",
      status: "review",
      version: "v1.0",
      genre: "Drama",
      audience: "remaja",
      dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
      reading_minutes: readingMinutes,
      updated_at: nowIso,
    })
    .execute();
  
  console.log("3. Work metadata updated");
  
  // 3. Clear old sections and insert new ones
  await db.deleteFrom("reading_sections").where("work_id", "=", "JLN-NOV-9990").execute();
  
  for (const section of sections) {
    await db
      .insertInto("reading_sections")
      .values({
        work_id: "JLN-NOV-9990",
        slug: section.slug,
        title: section.title,
        body: section.body.trim(),
        position: section.position,
        created_at: nowIso,
        updated_at: nowIso,
      })
      .execute();
  }
  
  console.log(`4. Created ${sections.length} reading sections`);
  
  // 4. Create revision v1.0
  const revisionId = `rev_JLN-NOV-9990_1_${Date.now()}`;
  const snapshot = {
    id: "JLN-NOV-9990",
    slug: "waktu-sebenar",
    title: "Waktu Sebenar",
    type: "novela",
    status: "review",
    genre: "Drama",
    audience: "remaja",
    dek: "Sebuah kisah tentang Wardah yang pulang ke kedai jam arwah abahnya, menemui bahawa masa bukan sekadar angka pada dinding.",
    readingMinutes: readingMinutes,
    body: "",
    sections: sections.map(s => ({
      slug: s.slug,
      title: s.title,
      body: s.body.trim(),
      position: s.position,
    })),
    readingSections: sections.map(s => ({
      slug: s.slug,
      title: s.title,
      body: s.body.trim(),
      position: s.position,
    })),
    credits: [],
    visuals: [],
    glossary: [],
    sourceWork: null,
    series: null,
    version: "v1.0",
    versionLabel: "v1.0",
    revisionCount: 1,
    publishedRevisionId: null,
    publishedAt: null,
    publishedBy: null,
    firstPublishedAt: null,
    editorialHistory: [],
  };
  
  await db
    .insertInto("work_revisions")
    .values({
      id: revisionId,
      work_id: "JLN-NOV-9990",
      revision_no: 1,
      version_label: "v1.0",
      change_type: "major",
      revision_summary: "Initial import: 30 BAB + EPILOG from Structural Edit v1.0",
      snapshot: JSON.stringify(snapshot) as any,
      content_hash: "import_v1.0",
      published_by: "system",
      published_at: nowIso,
      created_at: nowIso,
    })
    .execute();
  
  // Update work revision count
  await db
    .updateTable("works")
    .where("id", "=", "JLN-NOV-9990")
    .set({
      revision_count: 1,
      version_label: "v1.0",
      updated_at: nowIso,
    })
    .execute();
  
  console.log("5. Revision v1.0 created");
  console.log(`   Revision ID: ${revisionId}`);
  
  // Verify
  const work = await db.selectFrom("works").where("id", "=", "JLN-NOV-9990").selectAll().executeTakeFirst();
  const sectionCount = await db.selectFrom("reading_sections").where("work_id", "=", "JLN-NOV-9990").execute();
  const revisionCount = await db.selectFrom("work_revisions").where("work_id", "=", "JLN-NOV-9990").execute();
  
  console.log("\n=== VERIFICATION ===");
  console.log(`Title: ${work?.title}`);
  console.log(`Status: ${work?.status}`);
  console.log(`Sections: ${sectionCount.length}`);
  console.log(`Revisions: ${revisionCount.length}`);
  
  await closeDb();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});