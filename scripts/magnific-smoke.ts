/**
 * Phase 4D-5R — ONE real Magnific smoke test (non-public).
 * Submits a small Mystic task, polls until terminal status.
 * Does NOT approve, attach, or publish anything.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import {
  createMagnificAdapter,
} from "../src/lib/admin/visual-generation/magnific-adapter";

async function main() {
  const key = process.env.MAGNIFIC_API_KEY;
  if (!key) {
    console.error("SKIP: MAGNIFIC_API_KEY not set");
    process.exit(2);
  }

  const adapter = createMagnificAdapter();
  if (!adapter.isConfigured()) {
    console.error("FAIL: adapter not configured");
    process.exit(1);
  }

  const submission = await adapter.submitVisual!({
    prompt:
      "Editorial illustration for Malaysian teen literary magazine: a wooden rocking chair on a quiet wooden porch at dusk, soft muted palette, ink linework, no photorealism, no neon, composition-focused, house style, non-public smoke test",
    role: "inline",
    aspectRatio: "3:2",
    metadata: { model: "flexible" },
  });

  console.log("SUBMITTED:", JSON.stringify(submission, null, 2));

  if (!submission.taskId) {
    console.error("FAIL: no task_id");
    process.exit(1);
  }

  let status = submission.status;
  let assetUrl: string | null = null;
  // Bounded poll: up to 20 attempts, 6s apart (~2 min max)
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 6000));
    try {
      const polled = await adapter.pollVisualTask!(submission.taskId);
      status = polled.status;
      assetUrl = polled.assetUrl;
    } catch (e) {
      console.error("POLL_ERROR:", e instanceof Error ? e.message : e);
      continue;
    }
    console.log(`POLL ${i + 1}: status=${status} url=${assetUrl ?? "-"}`);
    if (["completed", "failed", "cancelled"].includes(status)) break;
  }

  console.log(
    "RESULT:",
    JSON.stringify(
      {
        taskId: submission.taskId,
        status,
        hasAsset: !!assetUrl,
        assetHost: assetUrl ? new URL(assetUrl).host : null,
      },
      null,
      2
    )
  );

  if (status === "completed" && assetUrl) {
    console.log("SMOKE_TEST=PASS");
    process.exit(0);
  }
  console.log("SMOKE_TEST=INCOMPLETE_OR_FAIL");
  process.exit(1);
}

main();
