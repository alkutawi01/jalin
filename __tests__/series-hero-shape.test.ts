import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const rule = css.match(/\.series-hero \{([^}]*)\}/)?.[1] ?? "";

if (!rule.includes("border-radius: 0")) {
  console.error("  ✗ the series-title hero must have sharp corners");
  process.exit(1);
}

console.log("  ✓ the series-title hero has sharp corners");
