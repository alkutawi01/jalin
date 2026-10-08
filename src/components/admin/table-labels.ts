/**
 * On a phone a table is shown as a list of cards (admin.css, "max-width: 700px"): every row a card, every cell a line, with the column's
 * name above its value. The names come from the table's own header row, copied onto each cell as data-label, so no table has to be
 * written twice. A table that cannot be a list of cards (the dashboard's to-do rows) opts out with the class a-todo-table.
 */

/** A column of buttons needs no name above them: "Aksi" over a lone Edit button only costs a line on every card. */
const ACTION_HEADERS = new Set(["aksi", "tindakan"]);

/** The label for each cell of a row: the header of the column the cell starts in. A cell that spans several columns, sits under an empty header, or is the column of actions, gets none. */
export function cellLabels(headers: string[], spans: number[]): (string | null)[] {
  let column = 0;
  return spans.map((span) => {
    const label = span === 1 ? (headers[column] ?? "").replace(/\s+/g, " ").trim() : "";
    column += span;
    return label && !ACTION_HEADERS.has(label.toLowerCase()) ? label : null;
  });
}

/** Put data-label on the cells of every table in `root`. Safe to run again and again (the page redraws its tables often). Returns how many cells it labelled. */
export function labelTableCells(root: ParentNode): number {
  let labelled = 0;
  root.querySelectorAll<HTMLTableElement>("table.admin-table:not(.a-todo-table)").forEach((table) => {
    const headRow = table.tHead?.rows[0];
    if (!headRow) return;
    const headers = Array.from(headRow.cells).flatMap((cell) => {
      const text = (cell.textContent ?? "").trim();
      return Array.from({ length: cell.colSpan || 1 }, (_, i) => (i === 0 ? text : ""));
    });
    table.querySelectorAll<HTMLTableRowElement>("tbody tr").forEach((row) => {
      const cells = Array.from(row.cells);
      const labels = cellLabels(headers, cells.map((cell) => cell.colSpan || 1));
      cells.forEach((cell, i) => {
        // A cell that is only a tick box needs no name above it: the card starts with the box.
        const onlyCheckbox = !(cell.textContent ?? "").trim() && cell.querySelector("input[type=checkbox]");
        const label = onlyCheckbox ? null : labels[i];
        if (label && cell.getAttribute("data-label") !== label) {
          cell.setAttribute("data-label", label);
          labelled++;
        }
      });
    });
  });
  return labelled;
}
