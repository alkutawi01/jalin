import fs from "node:fs";
import path from "node:path";

const css = fs.readFileSync(path.join(__dirname, "../src/app/globals.css"), "utf8");
const rule = css.match(/\.series-hero \{([^}]*)\}/)?.[1] ?? "";

if (!rule.includes("border-radius: 0 18px 18px 0")) {
  console.error("  ✗ the series-title hero must be sharp only on its left side");
  process.exit(1);
}

console.log("  ✓ the series-title hero is sharp on the left and rounded on the right");
