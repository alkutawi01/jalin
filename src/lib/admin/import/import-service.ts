/**
 * Persists an ImportPlan as a DRAFT work in ONE transaction: the work,
 * credits, characters, glossary, novela sections and draft visual
 * requests are all created or none are. Never publishes, never calls an
 * image provider.
 *
 * The existing admin services each open their own connection and read
 * back through other connections, so they cannot join a transaction;
 * this writer inserts the same column sets directly.
 */

import { getDb, hasDb } from "../../db";
import type { WorkType } from "../../db/types";
import { generateWorkId } from "../work-id";
import { upsertSourceProvenance } from "../source-rights";
import type { ImportPlan } from "./plan";
import { estimateReadingMinutes, countWords } from "./text-utils";

export interface ImportedVisualRequest {
  id: number;
  role: "hero" | "inline";
  finalPrompt: string;
  altText: string;
}

export interface ImportResultRecord {
  workId: string;
  slug: string;
  visualRequests: ImportedVisualRequest[];
  /** Non-fatal problems after the transaction committed (e.g. source provenance). */
  postWarnings: string[];
}

export async function importPlanAsDraft(
  plan: ImportPlan,
  actor: { id: string; email?: string }
): Promise<ImportResultRecord> {
  if (!hasDb()) {
    throw new Error("Pangkalan data tidak tersedia. Import memerlukan DATABASE_URL.");
  }
  const db = getDb();
  const now = new Date().toISOString();

  const created = await db.transaction().execute(async (trx) => {
    const clash = await trx
      .selectFrom("works")
      .where("slug", "=", plan.work.slug)
      .select("id")
      .executeTakeFirst();
    if (clash) {
      throw new Error(`Slug "${plan.work.slug}" already exists.`);
    }

    const id = await generateWorkId(trx, plan.work.type as WorkType);

    await trx
      .insertInto("works")
      .values({
        id,
        slug: plan.work.slug,
        title: plan.work.title,
        type: plan.work.type as WorkType,
        status: "draft",
        body: plan.work.body,
        genre: plan.work.genre,
        audience: plan.work.audience,
        dek: plan.work.dek,
        reading_minutes: plan.work.readingMinutes,
        version: "v0.1",
        version_label: null,
        revision_count: 0,
        editorial_history: JSON.stringify([
          {
            version: "v0.1",
            type: "initial",
            summary: "Draf awal disediakan melalui Tambah Karya",
            date: now
          }
        ]),
        metadata:
          plan.characters.length > 0 ? JSON.stringify({ characters: plan.characters }) : null,
        published_at: null,
        published_by: null,
        first_published_at: null,
        published_revision_id: null,
        updated_at: now,
        created_at: now
      })
      .execute();

    for (const credit of plan.credits) {
      await trx
        .insertInto("credits")
        .values({
          work_id: id,
          contributor_slug: null,
          guest_name: credit.guestName,
          role_label: credit.roleLabel,
          byline: credit.byline,
          is_public: credit.isPublic,
          sort_order: credit.sortOrder,
          created_at: now
        })
        .execute();
    }

    for (const term of plan.glossary) {
      await trx
        .insertInto("glossary_terms")
        .values({
          work_id: id,
          term: term.term,
          meaning: term.meaning,
          source: term.source,
          sort_order: term.sortOrder,
          created_at: now
        })
        .execute();
    }

    for (const section of plan.sections) {
      await trx
        .insertInto("reading_sections")
        .values({
          work_id: id,
          slug: section.slug,
          title: section.title,
          position: section.position,
          body: section.body,
          reading_minutes: estimateReadingMinutes(countWords(section.body)),
          created_at: now,
          updated_at: now
        })
        .execute();
    }

    const visualRequests: ImportedVisualRequest[] = [];
    for (const visual of plan.visuals) {
      const row = await trx
        .insertInto("visual_requests")
        .values({
          work_id: id,
          submission_id: null,
          visual_role: visual.role,
          prompt: visual.scenePrompt,
          provider: "magnific",
          provider_request_id: null,
          provider_creation_id: null,
          status: "draft",
          source_asset_url: null,
          source_asset_path: null,
          alt_text: visual.altText || null,
          anchor: visual.anchor,
          place: visual.place,
          approval_state: "pending",
          aspect_ratio: visual.aspectRatio as "1:1" | "3:2" | "2:3" | "16:9" | "9:16" | "4:3" | "3:4",
          model: null,
          execution_mode: "magnific_api",
          attempt_history: "[]",
          last_webhook_id: null,
          requested_by: "import",
          retry_count: 0,
          asset_finalized: false,
          created_at: now,
          updated_at: now
        })
        .returning("id")
        .executeTakeFirstOrThrow();
      visualRequests.push({
        id: row.id,
        role: visual.role,
        finalPrompt: visual.finalPrompt,
        altText: visual.altText
      });
    }

    if (plan.series) {
      let seriesId: string;
      if (plan.series.kind === "baharu") {
        const slugClash = await trx.selectFrom("series").where("slug", "=", plan.series.slug).select("id").executeTakeFirst();
        if (slugClash) throw new Error(`Slug siri "${plan.series.slug}" sudah wujud. Pilih "sambung siri sedia ada".`);
        seriesId = `SER-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        await trx
          .insertInto("series")
          .values({
            id: seriesId,
            slug: plan.series.slug,
            title: plan.series.title,
            dek: plan.series.dek,
            genre: plan.work.genre,
            audience: plan.work.audience,
            mode: plan.series.mode,
            status: "ongoing",
            created_at: now,
            updated_at: now
          })
          .execute();
      } else {
        const existing = await trx.selectFrom("series").where("id", "=", plan.series.seriesId).select("id").executeTakeFirst();
        if (!existing) throw new Error("Siri yang dipilih tidak ditemui.");
        seriesId = existing.id;
      }
      const last = await trx
        .selectFrom("series_entries")
        .where("series_id", "=", seriesId)
        .select((eb) => eb.fn.max("position").as("max"))
        .executeTakeFirst();
      await trx
        .insertInto("series_entries")
        .values({
          series_id: seriesId,
          work_id: id,
          position: Number(last?.max ?? 0) + 1,
          created_at: now,
          updated_at: now
        })
        .execute();
    }

    return { workId: id, visualRequests };
  });

  const postWarnings: string[] = [];
  if (plan.source && (plan.work.type === "fragmen" || plan.work.type === "sinopsis")) {
    try {
      await upsertSourceProvenance(
        created.workId,
        {
          originalTitle: plan.source.title,
          author: plan.source.author,
          originalLanguage: plan.source.language,
          sourceTextBasis: plan.source.provenance
        },
        actor
      );
    } catch (error) {
      postWarnings.push(
        `Draf dicipta tetapi sumber karya asal tidak disimpan (${error instanceof Error ? error.message : "ralat tidak diketahui"}). Isi di tab Sumber.`
      );
    }
  }

  return {
    workId: created.workId,
    slug: plan.work.slug,
    visualRequests: created.visualRequests,
    postWarnings
  };
}
