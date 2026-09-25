import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";

async function main() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  const db = getDb();
  
  console.log("=== ASSIGN AUTHOR TO WAKTU SEBENAR ===\n");
  
  const nowIso = new Date().toISOString();
  
  // Add author credit
  await db
    .insertInto("credits")
    .values({
      work_id: "JLN-NOV-9990",
      contributor_slug: "nara-zahin",
      role_label: "initial_draft",
      byline: true,
      is_public: true,
      sort_order: 1,
      created_at: nowIso,
    })
    .execute();
  
  console.log("1. Author credit added: nara-zahin (initial_draft)");
  
  // Verify
  const credits = await db.selectFrom("credits")
    .where("work_id", "=", "JLN-NOV-9990")
    .selectAll()
    .execute();
  
  console.log(`\n2. Credits: ${credits.length}`);
  for (const c of credits) {
    console.log(`   - ${c.contributor_slug} (${c.role_label})`);
  }
  
  await closeDb();
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});