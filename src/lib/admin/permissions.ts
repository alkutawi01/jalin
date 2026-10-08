/**
 * Who may do what in the admin: roles, permissions, and a table that says which permission every admin address and method needs.
 *
 * Pure data and arithmetic (no I/O), so the middleware (edge) and the tests can both use it.
 *
 * Today there is one account and its session says role "admin": that is the Pemilik (owner), who may do everything, so nothing changes
 * for it. The table is the first step towards more editors: when accounts with other roles exist, this is the single place that decides
 * what they can reach, and a test fails if a new admin route is added without a rule (an address with no rule is for the owner only).
 */

export const ROLES = ["owner", "chief_editor", "editor"] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  "session.use", // log out
  "content.read", // see works, credits, series, reports… (every staff role)
  "work.write", // create and edit works, sections, characters, places, times; import; editorial issues
  "work.publish", // publish, publish again, roll back a published copy
  "work.revert", // restore an earlier version
  "work.delete", // delete a draft
  "credit.write",
  "glossary.write",
  "visual.write", // upload and manage pictures, ask for one
  "visual.review", // approve, attach, complete or reject a generated picture
  "ai.generate", // anything that spends money on an AI service
  "series.manage",
  "source.manage", // source work rights and text review
  "submission.manage",
  "editorial.curate", // editor's picks
  "contributor.manage", // personas and contributors
  "site.manage", // site copy, theme, audience bands, writing prompts and their settings
  "typography.manage", // the size of the story text and its sub-headings (Tetapan > Saiz teks karya)
  "user.manage" // staff accounts: invite, change role, switch off, reset password
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const EDITOR: Permission[] = ["session.use", "content.read", "work.write", "credit.write", "glossary.write", "visual.write"];
const CHIEF_EDITOR: Permission[] = [...EDITOR, "visual.review", "ai.generate", "series.manage", "source.manage", "submission.manage", "editorial.curate", "typography.manage"];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSIONS,
  chief_editor: CHIEF_EDITOR,
  editor: EDITOR
};

/** The session of today's single account says "admin"; that account is the owner. */
export function roleFromClaim(claim: unknown): Role | null {
  if (claim === "admin") return "owner";
  return typeof claim === "string" && (ROLES as readonly string[]).includes(claim) ? (claim as Role) : null;
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

type Rule = { methods: readonly string[] | "*"; pattern: RegExp; permission: Permission };
const READ = ["GET", "HEAD"] as const;
const WRITE = ["POST", "PUT", "PATCH", "DELETE"] as const;
const ID = "[^/]+";

/** First match wins, so the specific rules come before the general ones. Addresses are matched without the "/api/admin" start. */
const API_RULES: Rule[] = [
  { methods: "*", pattern: /^\/auth\//, permission: "session.use" },
  // Staff accounts: never open to the generic read rule below, or every editor could list the others.
  { methods: "*", pattern: /^\/users(\/|$)/, permission: "user.manage" },

  { methods: "*", pattern: new RegExp(`^/works/${ID}/publish$`), permission: "work.publish" },
  { methods: "*", pattern: /^\/publish$/, permission: "work.publish" },
  { methods: "*", pattern: new RegExp(`^/works/${ID}/revisions/${ID}/revert$`), permission: "work.revert" },
  { methods: READ, pattern: new RegExp(`^/works/${ID}/revisions/`), permission: "content.read" },
  { methods: ["DELETE"], pattern: new RegExp(`^/works/${ID}$`), permission: "work.delete" },
  { methods: READ, pattern: /^\/works\//, permission: "content.read" },
  { methods: WRITE, pattern: new RegExp(`^/works/${ID}/source-rights`), permission: "source.manage" },
  { methods: WRITE, pattern: new RegExp(`^/works/${ID}/visuals/upload$`), permission: "visual.write" },
  { methods: WRITE, pattern: new RegExp(`^/works/${ID}/image-markers`), permission: "visual.write" },
  { methods: WRITE, pattern: /^\/works(\/|$)/, permission: "work.write" },

  { methods: ["POST"], pattern: /^\/generate$/, permission: "ai.generate" },
  { methods: "*", pattern: new RegExp(`^/visual-requests/${ID}/(generate|poll)$`), permission: "ai.generate" },
  { methods: "*", pattern: new RegExp(`^/visual-requests/${ID}/(approve|attach|complete|reject)$`), permission: "visual.review" },
  { methods: WRITE, pattern: /^\/visual-requests(\/|$)/, permission: "visual.write" },
  { methods: WRITE, pattern: /^\/visuals(\/|$)/, permission: "visual.write" },

  { methods: WRITE, pattern: /^\/credits(\/|$)/, permission: "credit.write" },
  { methods: WRITE, pattern: /^\/glossary(\/|$)/, permission: "glossary.write" },
  { methods: WRITE, pattern: /^\/series(\/|$)/, permission: "series.manage" },
  { methods: WRITE, pattern: /^\/(submissions|contributions)(\/|$)/, permission: "submission.manage" },
  { methods: WRITE, pattern: /^\/editorial-issues(\/|$)/, permission: "work.write" },
  { methods: ["PUT", "POST", "PATCH", "DELETE"], pattern: /^\/editor-picks$/, permission: "editorial.curate" },
  { methods: WRITE, pattern: /^\/(contributors|ai-personas)(\/|$)/, permission: "contributor.manage" },
  { methods: ["POST"], pattern: /^\/authoring\/prompt$/, permission: "work.write" },
  { methods: WRITE, pattern: /^\/(site-copy|site-theme|audience-bands|authoring\/settings|prompts)(\/|$)/, permission: "site.manage" },
  { methods: WRITE, pattern: /^\/reader-typography(\/|$)/, permission: "typography.manage" },

  // Everything else that only reads.
  { methods: READ, pattern: /^\//, permission: "content.read" }
];

const PAGE_RULES: Rule[] = [
  { methods: READ, pattern: /^\/admin\/pengguna(\/|$)/, permission: "user.manage" },
  { methods: READ, pattern: /^\/admin\/ubah-kata-laluan$/, permission: "session.use" },
  { methods: READ, pattern: /^\/admin\/settings\/saiz-teks$/, permission: "typography.manage" },
  { methods: READ, pattern: /^\/admin\/(settings|prompts)(\/|$)/, permission: "site.manage" },
  { methods: READ, pattern: /^\/admin\/contributors(\/|$)/, permission: "contributor.manage" },
  { methods: READ, pattern: /^\/admin\/pilihan-editor(\/|$)/, permission: "editorial.curate" },
  { methods: READ, pattern: /^\/admin(\/|$)/, permission: "content.read" }
];

/** The permission an admin address and method needs, or null when no rule covers it (then only the owner may use it). */
export function permissionFor(method: string, pathname: string): Permission | null {
  const m = method.toUpperCase();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const rules = path.startsWith("/api/admin") ? API_RULES : PAGE_RULES;
  const rest = path.startsWith("/api/admin") ? path.slice("/api/admin".length) || "/" : path;
  for (const rule of rules) {
    if ((rule.methods === "*" || rule.methods.includes(m)) && rule.pattern.test(rest)) return rule.permission;
  }
  return null;
}

/** May this role use this method on this admin address? An address with no rule is for the owner only (fail closed). */
export function isAllowed(role: Role, method: string, pathname: string): boolean {
  const permission = permissionFor(method, pathname);
  return permission === null ? role === "owner" : can(role, permission);
}
