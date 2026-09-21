import { spawn } from "node:child_process";

const INTERVAL_MS = 15000;
let stopping = false;

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      shell: true,
      stdio: options.stdio ?? "pipe"
    });

    let stdout = "";
    let stderr = "";

    if (child.stdout) child.stdout.on("data", (chunk) => (stdout += chunk));
    if (child.stderr) child.stderr.on("data", (chunk) => (stderr += chunk));

    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function syncOnce() {
  const status = await run("git", ["status", "--porcelain"]);
  if (status.stdout.trim()) {
    process.stdout.write("\n[dev:sync] Local changes detected; auto-pull paused.\n");
    return;
  }

  const result = await run("git", ["pull", "--ff-only", "--quiet", "origin", "main"]);
  if (result.code !== 0) {
    process.stdout.write(
      `\n[dev:sync] git pull skipped/failed: ${(result.stderr || result.stdout).trim()}\n`
    );
  }
}

const next = spawn("npm", ["run", "dev"], {
  shell: true,
  stdio: "inherit"
});

async function loop() {
  while (!stopping) {
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    if (stopping) break;
    await syncOnce();
  }
}

function stop() {
  stopping = true;
  if (!next.killed) next.kill("SIGINT");
  setTimeout(() => process.exit(0), 250);
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

next.on("exit", (code) => {
  stopping = true;
  process.exit(code ?? 0);
});

await syncOnce();
void loop();
