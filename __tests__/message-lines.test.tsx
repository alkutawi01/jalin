import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import StoryMarkdown from "../src/components/reader/StoryMarkdown";

function check(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// Every line in a message box is one message: it keeps its own line and its own bold sender; a blank line starts a new group.
const body = "Telefon bergetar.\n\n:::mesej\nrusukBiru: aku balik\nrusukBiru: atuk ketuk pintu\n\nmayanorth: ibu aku ada kat dapur\nmayanorth: aku jawab belum\n:::\n\nAku memandang mesej itu.";
const html = renderToStaticMarkup(<StoryMarkdown glossary={{}}>{body}</StoryMarkdown>);
check((html.match(/class="message-sender"/g) ?? []).length === 4, "Each message line must have its own bold sender");
check((html.match(/class="message-group"/g) ?? []).length === 2, "A blank line must start a new message group");
check(!html.includes("aku balik rusukBiru"), "Message lines must not run together in one paragraph");
console.log("message-lines.test.tsx passed");
