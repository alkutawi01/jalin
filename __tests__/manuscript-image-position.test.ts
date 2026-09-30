import { paragraphAtCaret } from "../src/lib/admin/manuscript-image-position";

const body = "Perenggan pertama.\n\nPerenggan kedua.\n\nAkhir.";
if (paragraphAtCaret(body, 0) !== "Perenggan pertama.") throw new Error("Caret at start must include the first character.");
if (paragraphAtCaret(body, 24) !== "Perenggan kedua.") throw new Error("Caret in middle must select that paragraph.");
if (paragraphAtCaret(body, body.length) !== "Akhir.") throw new Error("Caret at end must select the last paragraph.");
if (paragraphAtCaret("\n\n", 0) !== "") throw new Error("Empty paragraph should not produce an anchor.");
console.log("manuscript image position tests passed");
