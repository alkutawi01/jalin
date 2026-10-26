// Select text in the visual editor, press a toolbar icon: the selection itself becomes that format (break, heading, verse box).
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";

const entry = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import VisualManuscriptEditor from "./src/components/admin/VisualManuscriptEditor";
function App() {
  const [value, setValue] = useState("Satu.\\n\\n\\\\* \\\\* \\\\*\\n\\nTajuk Bahagian\\n\\nفَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ");
  window.currentMarkdown = value;
  return <VisualManuscriptEditor value={value} onChange={setValue} existingAnchors={[]} onMarkerInserted={() => {}} />;
}
createRoot(document.getElementById("root")).render(<App />);
`;

const bundle = await build({
  stdin: { contents: entry, loader: "tsx", resolveDir: process.cwd() },
  bundle: true,
  write: false,
  platform: "browser",
  format: "iife",
  jsx: "automatic",
});

const browser = await chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_CHROME_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROME_PATH }
    : process.platform === "win32" ? { executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" } : {}),
});
try {
  const page = await browser.newPage();
  await page.setContent('<div id="root"></div>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  await page.getByRole("textbox", { name: "Manuskrip visual" }).waitFor();
  const md = () => page.evaluate(() => window.currentMarkdown);
  const selectParagraph = async (index) => {
    await page.evaluate((n) => {
      const p = document.querySelectorAll(".visual-manuscript-surface > p")[n];
      const range = document.createRange();
      range.selectNodeContents(p);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.querySelector(".visual-manuscript-surface").dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    }, index);
  };

  // "* * *" selected, pemisah pressed: it becomes the break, not an extra one beside it.
  await selectParagraph(1);
  await page.getByRole("button", { name: "Sisip pemisah adegan" }).click();
  assert.match(await md(), /Satu\.\n\n---\n\nTajuk Bahagian/);
  assert.doesNotMatch(await md(), /\*/);

  // Words selected, tajuk pressed: they become the heading.
  await selectParagraph(1);
  await page.getByRole("button", { name: "Sisip tajuk bahagian" }).click();
  assert.match(await md(), /## Tajuk Bahagian/);

  // The Arabic line selected, kotak ayat pressed: it goes into the verse box.
  await selectParagraph(1);
  await page.getByRole("button", { name: "Sisip kotak ayat" }).click();
  assert.match(await md(), /:::ayat\n[^\n]*تُكَذِّبَانِ\n:::/);

  // Ordinary words selected, pemisah pressed: the words are never replaced by a break.
  await selectParagraph(0);
  await page.getByRole("button", { name: "Sisip pemisah adegan" }).click();
  assert.match(await md(), /Satu\./);
  console.log("visual-select-format.browser: passed");
} finally {
  await browser.close();
}
