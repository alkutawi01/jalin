/** Archive leftover test works (slug uji-e2e-*) after a run that used E2E_KEEP. Throwaway database only. */
import { config } from "dotenv";
config({ path: process.env.AUDIT_ENV!, override: true });
import { getDb, closeDb } from "../src/lib/db";
(async () => {
  const r = await getDb().updateTable("works").set({ status: "archived" } as never).where("slug", "like", "uji-e2e-%").where("status", "!=", "archived").executeTakeFirst();
  console.log("diarkibkan:", String(r.numUpdatedRows));
  await closeDb?.();
})();
