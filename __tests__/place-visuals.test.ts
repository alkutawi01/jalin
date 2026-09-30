import { placeVisuals } from "../src/lib/reader/place-visuals";

const body = "Awal. Tengah. Akhir.";
const later = { role: "inline", anchor: "Akhir.", place: "after", src: "later" };
const earlier = { role: "inline", anchor: "Awal.", place: "before", src: "earlier" };
const hero = { role: "hero", anchor: "Tengah.", place: "after", src: "hero" };
const missing = { role: "inline", anchor: "Tiada", place: "after", src: "missing" };

const nodes = placeVisuals(body, [later, hero, missing, earlier]);
if (nodes[0] !== "" || nodes[1] !== earlier || nodes[2] !== body || nodes[3] !== later || nodes[4] !== "") {
  throw new Error("Visuals must follow textual anchors, not database order; hero and unmatched visuals are excluded.");
}

const noVisuals = placeVisuals(body, [hero, missing]);
if (noVisuals.length !== 1 || noVisuals[0] !== body) {
  throw new Error("Body should remain intact when there are no matching inline visuals.");
}

console.log("place-visuals tests passed");
