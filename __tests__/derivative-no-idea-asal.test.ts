/** Izzat (8 Okt): the role "Idea asal" does not belong on a fragmen or a sinopsis (five published fragmen showed it). Refused on save and never ready to publish. */
import { isOriginalIdeaRole, roleNotAllowed } from "../src/lib/credit-roles";
import { evaluatePublicationReadinessFromData, type EvaluatePublicationReadinessInput } from "../src/lib/admin/publication-readiness";
import { creditErrorStatus } from "../src/lib/admin/metadata-rules";
import fs from "node:fs";
import path from "node:path";
let passed = 0, failed = 0;
function assert(c: boolean, m: string) { if (c) { passed++; console.log(`  ✓ ${m}`); } else { failed++; console.error(`  ✗ ${m}`); } }
assert(isOriginalIdeaRole("Idea asal") && isOriginalIdeaRole("  idea   ASAL ") && !isOriginalIdeaRole("Penulis") && !isOriginalIdeaRole("Pengarang asal") && !isOriginalIdeaRole(null), "the role is recognised whatever its spacing or case");
assert(roleNotAllowed("fragmen", "Idea asal") !== null && roleNotAllowed("sinopsis", "idea asal") !== null, "refused on fragmen and sinopsis");
assert(roleNotAllowed("cerpen", "Idea asal") === null && roleNotAllowed("novela", "Idea asal") === null && roleNotAllowed("bersiri", "Idea asal") === null, "still allowed on cerpen, novela and bersiri");
assert(roleNotAllowed("fragmen", "Pengarang asal") === null && roleNotAllowed("sinopsis", "Penterjemah") === null, "the other roles are not touched");
assert(creditErrorStatus(new Error(roleNotAllowed("fragmen", "Idea asal")!)) === 400, "the refusal is a 400, not a server error");
const base = (type: string, role: string): EvaluatePublicationReadinessInput => ({
  work: { id: "w", slug: "kisah", title: "Kisah", type, status: "ready", body: "Teks.", dek: "Dek.", genre: "Fiksyen", audience: "remaja", version: "v1.0", published_at: null, editorial_history: "[]" },
  credits: [{ id: 1, work_id: "w", contributor_slug: "izzat-anas", guest_name: null, role_label: role, byline: false, is_public: true, sort_order: 0 }],
  visuals: [], glossary: [], visualRequests: [], knownContributorSlugs: new Set(["izzat-anas"]), slugTakenByOther: false
});
assert(evaluatePublicationReadinessFromData(base("fragmen", "Idea asal")).blockers.some((b) => b.code === "credit_role_not_allowed"), "a fragmen already holding the credit is blocked from publication");
assert(!evaluatePublicationReadinessFromData(base("cerpen", "Idea asal")).blockers.some((b) => b.code === "credit_role_not_allowed"), "a cerpen with it is not");
const svc = fs.readFileSync(path.join(__dirname, "../src/lib/admin/credit-service.ts"), "utf8");
assert((svc.match(/roleNotAllowed\(/g) ?? []).length === 2, "both createCredit and updateCredit check the role");
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
