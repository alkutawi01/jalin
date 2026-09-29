import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";
import { composeVisualPrompt } from "../src/lib/admin/visual-generation/prompt-composer";
import {
  createMagnificAdapter,
  mapAspectRatioToMagnific,
} from "../src/lib/admin/visual-generation/magnific-adapter";

interface Job {
  slug: string;
  workTitle: string;
  workType: string;
  scene: string;
  alt: string;
}

const jobs: Job[] = [
  {
    slug: "sekuntum-bunga-untuk-alia",
    workTitle: "Sekuntum Bunga untuk Alia",
    workType: "novela",
    scene:
      "A Malay Muslim woman wearing a plain black niqab (her entire face completely covered by black fabric, absolutely no eyes, nose, mouth or skin visible -- the niqab is opaque) and a modest black long-sleeved abaya, seated at a desk, photographed/painted from directly behind her so only the back of her covered head and shoulders are seen in near-silhouette -- zero facial features visible anywhere in this image. She faces a single computer monitor. The ENTIRE monitor screen glows a cold, deep BLUE-GREY color (like slate or steel blue), never yellow, never orange, never warm -- and on that blue-grey screen is one pale white-blue wireframe outline of a flower made of thin geometric construction lines, like a CAD diagram, not a painted or photographed flower. The room around them is almost fully dark, unlit except for that cold blue-grey screen glow spilling onto the desk. No warm lamps, no window, no daylight, no orange or yellow light anywhere in this image.",
    alt: "Bunga digital biru kelabu terbentuk daripada garis geometri bercahaya lembut di atas skrin makmal gelap pada waktu malam.",
  },
];

async function main() {
  const adapter = createMagnificAdapter();
  if (!adapter.isConfigured()) {
    console.error("MAGNIFIC_API_KEY not configured.");
    process.exit(1);
  }

  for (const job of jobs) {
    console.log(`\n=== ${job.slug} ===`);
    const composed = composeVisualPrompt({
      sceneInstruction: job.scene,
      role: "hero",
      aspectRatio: "3:2",
      workTitle: job.workTitle,
      workType: job.workType,
    });
    console.log("Prompt:\n" + composed.finalPrompt);

    const submission = await adapter.submitVisual!({
      prompt: composed.finalPrompt,
      role: "hero",
      aspectRatio: "3:2",
    });
    console.log("Submitted task:", submission.taskId, submission.status);

    let result = submission;
    let attempts = 0;
    while (result.status !== "completed" && result.status !== "failed" && attempts < 60) {
      await new Promise((r) => setTimeout(r, 5000));
      const polled = await adapter.pollVisualTask!(submission.taskId!);
      console.log(`  poll #${attempts}:`, polled.status);
      if (polled.status === "completed") {
        result = { ...submission, status: "completed", assetUrl: polled.assetUrl };
        break;
      }
      if (polled.status === "failed") {
        result = { ...submission, status: "failed" };
        break;
      }
      attempts++;
    }

    if (result.status !== "completed" || !result.assetUrl) {
      console.error(`FAILED for ${job.slug}`);
      continue;
    }

    console.log("Downloading asset:", result.assetUrl);
    const imgRes = await fetch(result.assetUrl);
    if (!imgRes.ok) {
      console.error(`Download failed for ${job.slug}: ${imgRes.status}`);
      continue;
    }
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const dir = path.join(process.cwd(), "public", "visuals", job.slug);
    await fs.mkdir(dir, { recursive: true });
    const filePath = path.join(dir, "hero.png");
    await fs.writeFile(filePath, buffer);
    console.log(`Saved: ${filePath} (${buffer.length} bytes)`);
    console.log(`taskId (creationId): ${submission.taskId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
