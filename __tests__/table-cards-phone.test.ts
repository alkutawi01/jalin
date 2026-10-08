/**
 * Tables on a phone (8 Okt loop): the works list and the other admin tables scrolled sideways, so the last columns and the actions
 * (Sunting, Pratonton) were out of sight. Under 700px every table is now a list of cards: each row a card, each cell a line, the
 * column's name above its value. The names are copied from the table's header row onto the cells (data-label) by the admin shell.
 */
import fs from "node:fs";
import path from "node:path";
import { cellLabels } from "../src/components/admin/table-labels";

let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
const read = (p: string) => fs.readFileSync(path.join(__dirname, "..", p), "utf8").replace(/\r\n/g, "\n");

// The labels
assert(JSON.stringify(cellLabels(["Tajuk", "Alamat", "Jenis"], [1, 1, 1])) === JSON.stringify(["Tajuk", "Alamat", "Jenis"]), "each cell takes the name of its column");
assert(JSON.stringify(cellLabels(["Tajuk", "", "Status"], [1, 1, 1])) === JSON.stringify(["Tajuk", null, "Status"]), "a column with no name gives its cell no label");
assert(JSON.stringify(cellLabels(["A", "B", "C", "D"], [2, 1, 1])) === JSON.stringify([null, "C", "D"]), "a cell spanning two columns has no label and the next cell keeps its own column");
assert(JSON.stringify(cellLabels(["A", "B"], [2])) === JSON.stringify([null]) && JSON.stringify(cellLabels(["A"], [1, 1])) === JSON.stringify(["A", null]), "an empty-state row (one wide cell) and a row longer than the header never throw");
assert(JSON.stringify(cellLabels(["Tajuk", "Aksi"], [1, 1])) === JSON.stringify(["Tajuk", null]) && JSON.stringify(cellLabels(["Nama", " Tindakan "], [1, 1])) === JSON.stringify(["Nama", null]), "the column of actions (Aksi, Tindakan) has no name above its buttons");
assert(cellLabels(["  Dari   (tahun) "], [1])[0] === "Dari (tahun)", "spaces inside a heading are tidied");

// The module and its wiring
const labels = read("src/components/admin/table-labels.ts");
assert(labels.includes('table.admin-table:not(.a-todo-table)') && labels.includes("input[type=checkbox]") && labels.includes('cell.getAttribute("data-label") !== label'), "it skips the dashboard to-do table, leaves a tick-box cell unnamed, and does not rewrite a label that is already right");
const shell = read("src/components/admin/AdminShell.tsx");
assert(shell.includes('import { labelTableCells } from "./table-labels"') && shell.includes("linkLabels(document); labelTableCells(document);"), "the admin shell labels the cells, now and whenever the page redraws");

// The phone layout
const css = read("src/app/admin/admin.css");
const start = css.indexOf("A table is a list of cards on a phone");
const phone = css.slice(start, css.indexOf("\n}\n", start) + 3);
assert(/@media \(max-width: 700px\)/.test(phone), "the card layout is for phones (700px and under)");
assert(phone.includes("overflow-x: visible") && phone.includes("td { display: block; width: 100%; }"), "the table no longer scrolls sideways: rows and cells stack");
assert(phone.includes("td[data-label]::before { content: attr(data-label)"), "each cell shows its column's name above its value");
assert(phone.includes("thead { position: absolute;") && !/thead \{[^}]*display: none/.test(phone), "the header row is hidden from sight but kept for screen readers");
assert((phone.match(/:not\(\.a-todo-table\)/g) ?? []).length >= 8, "every rule leaves the dashboard to-do table alone");
assert(phone.includes("white-space: normal") && phone.includes("td:nth-child(n+3)"), "the no-wrap rule for later columns is overridden");

// The same cards by the width of the table's own box (a 900px window with the sidebar open leaves a table about 600px wide)
assert(css.includes(".a-shell .admin-table-wrap { container: admin-table / inline-size; }"), "a table's box is a container, so the layout follows its width, not the window's");
const boxStart = css.indexOf("@container admin-table (max-width: 760px) {");
const box = boxStart < 0 ? "" : css.slice(boxStart, css.indexOf("\n}\n", boxStart) + 3);
assert(box.includes("td[data-label]::before { content: attr(data-label)") && box.includes("td { display: block; width: 100%; }") && (box.match(/:not\(\.a-todo-table\)/g) ?? []).length >= 8, "inside a narrow box the rows stack as cards, with the same rules as the phone layout");
assert(/@container admin-table \(min-width: 480px\) and \(max-width: 760px\) {[^}]*repeat\(2, minmax\(0, 1fr\)\)/.test(css) && css.includes("td:last-child { grid-column: 1 / -1; }"), "a box wide enough for two columns puts the fields in pairs, with the title and the actions across the full width");

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
