import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";

const entry = `
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import VisualManuscriptEditor from "./src/components/admin/VisualManuscriptEditor";
function App() {
  const [value, setValue] = useState("Perenggan pertama.\\n\\n## Bab 1\\n\\nTeks *condong*.\\n\\n[[gambar:1]]");
  const [visual, setVisual] = useState(true);
  window.currentMarkdown = value;
  return <><button id="toggle" onClick={() => setVisual(!visual)}>Tukar mod</button>{visual
    ? <VisualManuscriptEditor value={value} onChange={setValue} existingAnchors={[]} onMarkerInserted={() => {}} />
    : <textarea aria-label="Sumber Markdown" value={value} onChange={(event) => setValue(event.target.value)} />}
    <button id="source" onClick={() => { window.currentMarkdown = value; }}>Sumber</button></>;
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
  const editor = page.getByRole("textbox", { name: "Manuskrip visual" });
  await editor.waitFor();
  assert.match(await editor.innerText(), /Perenggan pertama/);
  assert.equal(await page.locator(".visual-manuscript-marker").count(), 1);
  await page.evaluate(() => {
    const text = document.querySelector(".visual-manuscript-surface p").firstChild;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 9);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    document.querySelector(".visual-manuscript-surface").dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
  });
  await page.getByRole("button", { name: "Tebalkan teks terpilih" }).click();
  assert.match(await page.evaluate(() => window.currentMarkdown), /\*\*Perenggan\*\* pertama/);

  await page.getByRole("button", { name: "Sisip perenggan", exact: true }).click();
  await editor.pressSequentially("Perenggan baharu.");
  await page.getByRole("button", { name: "Sumber" }).click();
  assert.match(await page.evaluate(() => window.currentMarkdown), /Perenggan baharu\./);
  assert.match(await page.evaluate(() => window.currentMarkdown), /\[\[gambar:1\]\]/);
  assert.match(await page.evaluate(() => window.currentMarkdown), /## Bab 1/);

  await page.getByRole("button", { name: "Sisip penanda gambar" }).click();
  assert.match(await page.evaluate(() => window.currentMarkdown), /\[\[gambar:2\]\]/);
  await page.getByRole("button", { name: "Sisip kotak mesej" }).click();
  await editor.pressSequentially("Aku sudah sampai.");
  assert.match(await page.evaluate(() => window.currentMarkdown), /:::mesej\nAku sudah sampai\.\n:::/);
  await page.getByRole("button", { name: "Tukar mod" }).click();
  const source = page.getByRole("textbox", { name: "Sumber Markdown" });
  assert.match(await source.inputValue(), /\[\[gambar:2\]\]/);
  await page.getByRole("button", { name: "Tukar mod" }).click();
  assert.equal(await page.locator(".visual-manuscript-marker").count(), 2);
  assert.match(await page.getByRole("textbox", { name: "Manuskrip visual" }).innerText(), /Aku sudah sampai/);
  console.log("visual-manuscript-editor.browser: passed");
} finally {
  await browser.close();
}
