import assert from "node:assert/strict";
import { fileMatchesAccept } from "../src/components/admin/useFileDrop";

const img = "image/png,image/jpeg,image/webp";
const file = (name: string, type: string) => ({ name, type }) as File;

assert.equal(fileMatchesAccept(file("a.png", "image/png"), img), true, "a PNG is accepted for a picture box");
assert.equal(fileMatchesAccept(file("a.JPG", "image/jpeg"), img), true, "a JPEG is accepted");
assert.equal(fileMatchesAccept(file("a.gif", "image/gif"), img), false, "a GIF is refused");
assert.equal(fileMatchesAccept(file("a.pdf", "application/pdf"), img), false, "a PDF is refused");
assert.equal(fileMatchesAccept(file("nota.txt", "text/plain"), ".txt,.md,text/plain,text/markdown"), true, "a text file is accepted for the manuscript box");
assert.equal(fileMatchesAccept(file("nota.MD", ""), ".txt,.md,text/plain,text/markdown"), true, "an extension alone is enough (browsers often leave the type empty for .md)");
assert.equal(fileMatchesAccept(file("a.png", "image/png"), ".txt,.md"), false, "a picture is refused by the manuscript box");
console.log("file-drop-accept: ok");
