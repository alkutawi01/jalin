import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { EditorNote } from "../src/components/reader/StoryChrome";
import { unescapeItalicMarks } from "../src/lib/reader/literal-emphasis";

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const BS = String.fromCharCode(92);
// A note pasted with its italic marks escaped must still italicise, not show stars.
const escaped = `${BS}*Ayat-Ayat Cinta${BS}* karya Habiburrahman dalam akhbar ${BS}*Republika${BS}*.`;
check(unescapeItalicMarks(escaped) === "*Ayat-Ayat Cinta* karya Habiburrahman dalam akhbar *Republika*.", "escaped marks are unescaped");
const html = renderToStaticMarkup(<EditorNote note={escaped} />);
check(html.includes("<em>Ayat-Ayat Cinta</em>") && html.includes("<em>Republika</em>"), "escaped marks render as italics");
check(!html.includes("*"), "no star is shown");
// Plain marks and notes without marks are unchanged.
check(renderToStaticMarkup(<EditorNote note={"Catatan *biasa* sahaja."} />).includes("<em>biasa</em>"), "plain marks still italicise");
check(unescapeItalicMarks("tiada tanda") === "tiada tanda", "text without marks is unchanged");
console.log("editor-note-escaped-stars passed");
