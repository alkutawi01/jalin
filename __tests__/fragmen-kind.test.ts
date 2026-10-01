import assert from "node:assert/strict";
import { classifyFragmen, isMalayLanguage } from "../src/lib/content/fragmen-kind";

assert.equal(classifyFragmen("Bahasa Indonesia", "Indonesia"), "asal");
assert.equal(classifyFragmen("Inggeris", "Bahasa Melayu"), "terjemahan");
assert.equal(classifyFragmen("Melayu Klasik", "Melayu"), "asal");
assert.equal(classifyFragmen("", "Melayu"), "belum_ditentukan");
assert.equal(isMalayLanguage("Bahasa Melayu"), true);
assert.equal(isMalayLanguage("Melayu Klasik"), true);
assert.equal(isMalayLanguage("Bahasa Indonesia"), false);
console.log("fragmen language classification tests passed");
