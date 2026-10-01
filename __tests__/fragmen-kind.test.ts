import assert from "node:assert/strict";
import { classifyFragmen } from "../src/lib/content/fragmen-kind";

assert.equal(classifyFragmen("Bahasa Indonesia", "Indonesia"), "asal");
assert.equal(classifyFragmen("Inggeris", "Bahasa Melayu"), "terjemahan");
assert.equal(classifyFragmen("Melayu Klasik", "Melayu"), "asal");
assert.equal(classifyFragmen("", "Melayu"), "belum_ditentukan");
console.log("fragmen language classification tests passed");
