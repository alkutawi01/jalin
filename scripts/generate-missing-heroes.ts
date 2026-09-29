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
    slug: "di-hadapan-singgahsana",
    workTitle: "Di Hadapan Singgahsana",
    workType: "sinopsis",
    scene:
      "An ancient Egyptian judgment hall lit by torchlight, a grand empty stone throne on a raised dais flanked by towering columns carved with hieroglyphs, faint robed pharaonic figures approaching from the shadows, shown from behind or obscured by pillars so no faces are clearly visible, a sense of timelessness and reckoning, warm golden torchlight.",
    alt: "Dewan pengadilan Mesir purba dengan singgahsana kosong dan bayangan pemerintah menghadap dari kejauhan.",
  },
  {
    slug: "gatsby-agung",
    workTitle: "Gatsby Agung",
    workType: "sinopsis",
    scene:
      "A grand 1920s mansion overlooking a dark bay at dusk, warm light glowing from tall windows with a lively party silhouette in the background, in the foreground a solitary figure standing at the end of a wooden dock reaching toward a single green light glowing across the water, the figure shown from behind in silhouette so no face is visible, wistful golden-to-twilight lighting.",
    alt: "Siluet seorang lelaki di hujung jeti memandang cahaya hijau di seberang teluk, dengan rumah agung bercahaya di belakang.",
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
      const polled = await adapter.pollVisualTask!(submission.taskId);
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
