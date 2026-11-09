import { timingSafeEqual } from "node:crypto";
import type { Kysely } from "kysely";
import type { Database } from "../db/types";
import { decryptLabelCode } from "../subscription/label-crypto";
import { buildLabelPdf, computeLayout, DEFAULT_LABEL, type LabelSettings } from "../subscription/label";
import { computeCodeMac, normaliseSerial, redeemByLabel } from "../subscription/redeem-code";
import { createBatch } from "./redeem";
import type { MacKey } from "./primitives";
import type { Db } from "./service";

export class LabelPrintError extends Error {
  constructor(public readonly reason: "unavailable" | "selection" | "recovery" | "layout" | "actor") { super(`Physical labels: ${reason}`); }
}
type Actor = { id: string; name: string };
type PrintDeps = { keys: readonly MacKey[]; actor: Actor; now?: Date };
export type PrintedLabels = { pdf: string; batchId: string; batchNumber: string; count: number };

const transaction = <T>(db: Db, run: (trx: Db) => Promise<T>) => db.isTransaction ? run(db) : (db as Kysely<Database>).transaction().execute(run);
const validActor = (actor: Actor) => !!actor.id.trim() && !!actor.name.trim() && actor.id !== "tidak-diketahui";

/** Private PDF only; never return the loaded codes, MACs, keys or ciphertext as JSON/props. */
export async function printPhysicalLabels(db: Db, deps: PrintDeps, input: { batchId: string; serials?: string[]; initial?: boolean }): Promise<PrintedLabels> {
  if (!validActor(deps.actor)) throw new LabelPrintError("actor");
  const wanted = input.serials ? [...new Set(input.serials.map((value) => normaliseSerial(value)))] : null;
  if (wanted && (!wanted.length || wanted.length > 5000 || wanted.some((value) => value === null))) throw new LabelPrintError("selection");
  return transaction(db, async (trx) => {
    const batch = await trx.selectFrom("code_batches").selectAll().where("id", "=", input.batchId).forShare().executeTakeFirst();
    if (!batch || batch.channel !== "physical" || batch.status === "VOIDED") throw new LabelPrintError("unavailable");
    let query = trx.selectFrom("redeem_codes as c").leftJoin("redemptions as r", "r.code_id", "c.id")
      .selectAll("c").select("r.id as redemption").where("c.batch_id", "=", batch.id).orderBy("c.serial", "asc").forUpdate("c");
    if (wanted) query = query.where("c.serial", "in", wanted as string[]);
    const rows = await query.execute();
    const now = deps.now ?? new Date();
    const eligible = rows.filter((row) => row.state !== "revoked" && !row.redemption && (!row.redeem_by || row.redeem_by > now) && !!row.label_cipher && !!row.label_key_id);
    if (wanted && (rows.length !== wanted.length || eligible.length !== wanted.length)) throw new LabelPrintError("selection");
    if (!eligible.length) throw new LabelPrintError("unavailable");
    const layout = (batch.label_layout ?? DEFAULT_LABEL) as LabelSettings;
    if (computeLayout(layout, undefined, { hasRedeemBy: eligible.some((row) => !!row.redeem_by) }).problems.some((problem) => problem.level === "error")) throw new LabelPrintError("layout");
    const labels = eligible.map((row) => {
      try {
        const encryptionKey = deps.keys.find((key) => key.keyId === row.label_key_id);
        const macKey = deps.keys.find((key) => key.keyId === row.key_id);
        if (!encryptionKey || !macKey) throw new LabelPrintError("recovery");
        const canonical = decryptLabelCode(encryptionKey.key, row.serial, row.label_cipher!);
        const expected = Buffer.from(computeCodeMac(macKey.key, row.serial, canonical), "hex");
        const actual = Buffer.from(row.code_mac, "hex");
        if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) throw new LabelPrintError("recovery");
        return { canonical, serial: row.serial, batchNumber: batch.batch_number, planText: `${batch.months} bulan`, redeemBy: row.redeem_by ? redeemByLabel(row.redeem_by) : undefined };
      } catch { throw new LabelPrintError("recovery"); }
    });
    const pdf = buildLabelPdf(layout, labels).pdf;
    // If the mandatory audit fails the transaction (including initial generation) must fail too.
    await trx.insertInto("admin_activity").values({
      at: now, actor_id: deps.actor.id, actor_name: deps.actor.name.trim().slice(0, 120), actor_role: "owner",
      action: input.initial ? "subscription.batch.create" : "subscription.labels.print", subject_type: "batch", subject_id: batch.id, work_id: null,
      summary: `${deps.actor.name.trim().slice(0, 80)}: ${labels.length} label ${input.initial ? "dijana" : "dicetak semula"}; kelompok ${batch.batch_number}.`,
    }).execute();
    return { pdf, batchId: batch.id, batchNumber: batch.batch_number, count: labels.length };
  });
}

/** Store first, then recover the stored codes to build the first PDF, all inside one transaction. */
export async function generatePhysicalLabels(
  db: Db,
  deps: { codeKey: MacKey; actor: Actor; now?: Date },
  input: Omit<Parameters<typeof createBatch>[2], "createdBy">,
): Promise<PrintedLabels> {
  if (!validActor(deps.actor)) throw new LabelPrintError("actor");
  return transaction(db, async (trx) => {
    const made = await createBatch(trx, deps, { ...input, createdBy: deps.actor.name });
    return printPhysicalLabels(trx, { keys: [deps.codeKey], actor: deps.actor, now: deps.now }, { batchId: made.batchId, initial: true });
  });
}
