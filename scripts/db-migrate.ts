import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });
import { getDb, hasDb, closeDb } from "../src/lib/db";
import { getAllWorks, getAllContributors, validateAllData } from "./db-seed";

async function migrate() {
  if (!hasDb()) {
    console.error("DATABASE_URL not set. Cannot migrate.");
    process.exit(1);
  }

  const db = getDb();

  try {
    console.log("Validating content data...");
    const validation = validateAllData();
    console.log(`Found ${validation.works} works and ${validation.contributors} contributors`);

    if (validation.errors.length > 0) {
      console.error("Validation errors:");
      validation.errors.forEach(e => console.error(`  - ${e}`));
      process.exit(1);
    }

    console.log("Starting migration...");

    await db.transaction().execute(async (trx) => {
      const contributors = getAllContributors();
      console.log(`Migrating ${contributors.length} contributors...`);

      for (const contributor of contributors) {
        await trx
          .insertInto("contributors")
          .values({
            slug: contributor.slug,
            display_name: contributor.displayName,
            kind: contributor.kind as "human" | "virtual" | "organization",
            bio: contributor.bio,
            disclosure: contributor.disclosure || null,
            is_visible: true,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .onConflict((oc) => oc.column("slug").doNothing())
          .execute();
      }

      const works = getAllWorks();
      console.log(`Migrating ${works.length} works...`);

      for (const work of works) {
        await trx
          .insertInto("works")
          .values({
            id: work.id,
            slug: work.slug,
            title: work.title,
            type: work.type as "cerpen" | "novela" | "bersiri" | "terjemahan" | "fragmen" | "sinopsis",
            status: work.status as "draft" | "review" | "ready" | "published" | "archived",
            genre: work.genre,
            audience: work.audience,
            dek: work.dek,
            body: work.body,
            reading_minutes: work.readingMinutes,
            version: work.version,
            editorial_history: JSON.stringify(work.editorialHistory),
            published_at: work.publishedAt || null,
            updated_at: work.updatedAt || new Date().toISOString(),
            created_at: new Date(),
          })
          .onConflict((oc) => oc.column("id").doNothing())
          .execute();

        for (let i = 0; i < work.credits.length; i++) {
          const credit = work.credits[i] as Record<string, unknown>;
          await trx
            .insertInto("credits")
            .values({
              work_id: work.id,
              contributor_slug: String(credit.contributor || credit.slug || ""),
              guest_name: null,
              role_label: String(credit.role || ""),
              byline: Boolean(credit.byline),
              is_public: true,
              sort_order: i,
              created_at: new Date(),
            })
            .execute();
        }

        for (let i = 0; i < work.visuals.length; i++) {
          const visual = work.visuals[i] as Record<string, unknown>;
          await trx
            .insertInto("visuals")
            .values({
              work_id: work.id,
              role: (visual.role || "inline") as "hero" | "inline" | "section",
              src: String(visual.src || ""),
              alt: visual.alt ? String(visual.alt) : null,
              provider: visual.provider ? String(visual.provider) : null,
              creation_id: visual.creationId ? String(visual.creationId) : null,
              anchor: visual.anchor ? String(visual.anchor) : null,
              place: (visual.place || "after") as "before" | "after",
              sort_order: i,
              created_at: new Date(),
            })
            .execute();
        }

        for (let i = 0; i < work.glossary.length; i++) {
          const term = work.glossary[i] as Record<string, unknown>;
          await trx
            .insertInto("glossary_terms")
            .values({
              work_id: work.id,
              term: String(term.term || ""),
              meaning: String(term.meaning || ""),
              source: String(term.source || "Kamus Dewan Edisi Keempat"),
              sort_order: i,
              created_at: new Date(),
            })
            .execute();
        }
      }
    });

    console.log("Migration completed successfully!");

    const workCount = await db.selectFrom("works").select(db.fn.count("id").as("count")).executeTakeFirst();
    const contributorCount = await db.selectFrom("contributors").select(db.fn.count("slug").as("count")).executeTakeFirst();
    const creditCount = await db.selectFrom("credits").select(db.fn.count("id").as("count")).executeTakeFirst();
    const visualCount = await db.selectFrom("visuals").select(db.fn.count("id").as("count")).executeTakeFirst();
    const glossaryCount = await db.selectFrom("glossary_terms").select(db.fn.count("id").as("count")).executeTakeFirst();

    console.log("\nRow counts:");
    console.log(`  works: ${workCount?.count || 0}`);
    console.log(`  contributors: ${contributorCount?.count || 0}`);
    console.log(`  credits: ${creditCount?.count || 0}`);
    console.log(`  visuals: ${visualCount?.count || 0}`);
    console.log(`  glossary_terms: ${glossaryCount?.count || 0}`);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await closeDb();
  }
}

migrate();
