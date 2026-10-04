/**
 * A line that is only one symbol repeated (at least three times, spaces allowed) is a scene break: "---", "***", "___",
 * "* * *", "~~~", "###", "# # #", "===", "• • •" and the like. Markdown itself only knows a few of these, and the rest do
 * harm: "~~~" opens a code block that swallows the rest of the chapter, "###" and "# # #" become empty or giant headings,
 * and "---" or "===" straight under a sentence turn that sentence into a heading. Every such line becomes a plain "---"
 * with a blank line on each side.
 *
 * Deliberately NOT a scene break: a line of dots ("..." or "…"), which is silence in a dialogue, and dashes in a sentence.
 */
const ORNAMENT = /^([-*_~=#•·◆◇✦✧⁂])(?:[ \t]*\1){2,}$/u;

export function isSceneBreakLine(line: string): boolean {
  return ORNAMENT.test(line.trim());
}

export function normalizeSceneBreaks(markdown: string): string {
  const out: string[] = [];
  for (const line of markdown.split("\n")) {
    if (isSceneBreakLine(line)) {
      if (out.length > 0 && out[out.length - 1] !== "") out.push("");
      out.push("---", "");
    } else {
      out.push(line);
    }
  }
  return out.join("\n");
}
