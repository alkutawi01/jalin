// Side notes in the visual editor, in a real browser (Izzat, 9 Okt 2026: "how do I edit the note?"): numbers are chips in the text, the notes are kept
// apart, a click opens a note, Backspace removes a chip and its note, Undo brings them back, and a new note goes in at the cursor.
// Needs Chrome (PLAYWRIGHT_CHROME_PATH, or the usual place on Windows). Run: node __tests__/visual-notes.browser.mjs
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";

const START = [
  "Dia memandang jauh.[^b] Hujan turun lagi.[^a]",
  "",
  "Esoknya ia reda.[^b] Hari ketiga.",
  "",
  "[^a]: Nota A.",
  "[^b]: Nota B.",
  "",
  "[^c]: Nota C tanpa nombor."
].join("\\n");

const entry = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import VisualManuscriptEditor from "./src/components/admin/VisualManuscriptEditor";
function App() {
  const [value, setValue] = useState("${START}");
  const [visual, setVisual] = useState(true);
  window.currentMarkdown = value;
  return <><button id="toggle" onClick={() => setVisual(!visual)}>Tukar mod</button>{visual
    ? <VisualManuscriptEditor value={value} onChange={setValue} existingAnchors={[]} onMarkerInserted={() => {}} />
    : <textarea aria-label="Sumber Markdown" value={value} onChange={(event) => setValue(event.target.value)} />}</>;
}
createRoot(document.getElementById("root")).render(<App />);
`;

const bundle = await build({ stdin: { contents: entry, loader: "tsx", resolveDir: process.cwd() }, bundle: true, write: false, platform: "browser", format: "iife", jsx: "automatic" });

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
    : process.platform === "win32" ? { executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" } : {}),
});
try {
  const page = await browser.newPage();
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  const editor = page.getByRole("textbox", { name: "Manuskrip visual" });
  await editor.waitFor();
  const markdown = () => page.evaluate(() => window.currentMarkdown);
  const chips = () => page.locator(".visual-manuscript-surface [data-note]");
  const numbers = async () => (await chips().allInnerTexts()).join(",");
  const labels = async () => (await chips().evaluateAll((list) => list.map((chip) => chip.dataset.note))).join(",");
  /** The cursor just after the chip number `at` (0 = the first chip in the text). */
  const cursorAfterChip = (at) => page.evaluate((index) => {
    const surface = document.querySelector(".visual-manuscript-surface");
    const chip = surface.querySelectorAll("[data-note]")[index];
    surface.focus();
    const range = document.createRange();
    range.setStartAfter(chip);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    surface.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  }, at);

  // The text shows chips, not code, and the notes are not in the text
  assert.equal(await chips().count(), 3, "three numbers in the text");
  assert.equal(await numbers(), "1,2,1", "numbered as a reader sees them: b is 1, a is 2, b again is 1");
  const shown = await editor.innerText();
  assert.ok(!shown.includes("[^") && !shown.includes("Nota A.") && !shown.includes("Nota C"), "no code and no note lines in the text");
  assert.equal(await chips().first().getAttribute("contenteditable"), "false");

  // A click opens the note; saving writes the new words and keeps everything else
  await chips().first().click();
  const box = page.getByRole("dialog", { name: "Sunting nota 1" });
  await box.waitFor();
  assert.equal(await box.locator("textarea").inputValue(), "Nota B.");
  assert.equal(await box.getByRole("button", { name: "Simpan nota" }).isDisabled(), true, "nothing to save yet");
  await box.locator("textarea").fill("Nota B diubah.");
  await box.getByRole("button", { name: "Simpan nota" }).click();
  await box.waitFor({ state: "detached" });
  let text = await markdown();
  assert.match(text, /\[\^b\]: Nota B diubah\./);
  assert.match(text, /\[\^a\]: Nota A\./);
  assert.match(text, /\[\^c\]: Nota C tanpa nombor\./, "a note nothing points to is kept");
  assert.match(text, /^Dia memandang jauh\.\[\^b\] Hujan turun lagi\.\[\^a\]\n\nEsoknya ia reda\.\[\^b\] Hari ketiga\./, "the text is as it was");

  // Escape closes the box without changing anything
  await chips().first().click();
  await page.getByRole("dialog", { name: "Sunting nota 1" }).locator("textarea").fill("tidak disimpan");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached" });
  assert.match(await markdown(), /\[\^b\]: Nota B diubah\./);

  // Backspace right after a chip removes the chip and its note; the numbers follow; Undo brings both back
  await cursorAfterChip(1); // the chip of note a, at the end of the first paragraph
  await page.keyboard.press("Backspace");
  text = await markdown();
  assert.ok(!text.includes("[^a]") && !text.includes("Nota A."), "the number and the words are both gone");
  assert.match(text, /\[\^b\]: Nota B diubah\./);
  assert.match(text, /\[\^c\]: Nota C/);
  assert.equal(await numbers(), "1,1");
  await page.keyboard.press("Control+z");
  text = await markdown();
  assert.match(text, /\[\^a\]: Nota A\./, "Undo brings the note back");
  assert.equal(await labels(), "b,a,b");

  // A new note goes in at the cursor, as a chip, and takes the number of its place in the text
  await page.evaluate(() => {
    const surface = document.querySelector(".visual-manuscript-surface");
    surface.focus();
    const paragraph = surface.querySelectorAll("p")[1];
    const node = paragraph.firstChild;
    const range = document.createRange();
    range.setStart(node, 7); // just after "Esoknya"
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    surface.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Sisip nota sisi" }).click();
  await page.getByRole("group", { name: "Sisip nota sisi" }).locator("textarea").fill("Nota baharu.");
  await page.getByRole("button", { name: "Sisip nota", exact: true }).click();
  text = await markdown();
  assert.match(text, /^Dia memandang jauh\.\[\^b\] Hujan turun lagi\.\[\^a\]\n\nEsoknya\[\^\d+\] ia reda\./, "the number is at the cursor");
  assert.match(text, /\[\^\d+\]: Nota baharu\./);
  assert.equal(await chips().count(), 4);
  assert.equal(await numbers(), "1,2,3,1", "the new chip is third in the text, so it is 3; b stays 1");

  // Other editors see the same manuscript
  await page.getByRole("button", { name: "Tukar mod" }).click();
  const source = await page.getByRole("textbox", { name: "Sumber Markdown" }).inputValue();
  assert.match(source, /\[\^b\]: Nota B diubah\./);
  await page.getByRole("button", { name: "Tukar mod" }).click();
  await chips().first().waitFor();
  assert.equal(await chips().count(), 4, "back in the visual editor the chips are drawn again from the text");

  console.log("visual-notes.browser: passed");
} finally {
  await browser.close();
}
