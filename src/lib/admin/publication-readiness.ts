/**
 * Publication Readiness — central editorial gate before explicit publish.
 *
 * Generation ≠ Approval ≠ Attachment ≠ Publication.
 * Readiness only PERMITS publication; it never publishes.
 * Blockers prevent publish; warnings never do.
 */

import type { WorkStatus, WorkType } from "../db/types";

export type ReadinessGateName =
  | "content"
  | "credits"
  | "visuals"
  | "privacy"
  | "rights"
  | "workflow";

export interface ReadinessIssue {
  code: string;
  message: string;
}

export interface ReadinessGateResult {
  pass: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

export interface PublicationReadiness {
  ready: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  gates: Record<ReadinessGateName, ReadinessGateResult>;
  checkedAt: string;
}

export interface ReadinessWorkInput {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: WorkStatus | string;
  body: string | null;
  dek: string | null;
  genre: string | null;
  audience: string | null;
  version: string;
  published_at: string | Date | null;
  editorial_history: unknown;
}

export interface ReadinessCreditInput {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
}

export interface ReadinessVisualInput {
  id: number;
  work_id: string;
  role: string;
  src: string;
  alt: string | null;
  provider: string | null;
  creation_id: string | null;
  anchor: string | null;
  place: string;
  sort_order: number;
  is_asset_finalized: boolean | null | undefined;
}

export interface ReadinessGlossaryInput {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
}

export interface ReadinessVisualRequestInput {
  id: number;
  work_id: string | null;
  status: string;
  approval_state: string;
  provider_creation_id: string | null;
}

/** source_works row shape for the rights gate (null when no provenance record). */
export interface ReadinessSourceWorkInput {
  original_title: string | null;
  author: string | null;
  original_language: string | null;
  source_edition: string | null;
  source_url: string | null;
  source_locator: string | null;
  source_text_basis: string | null;
  rights_status: string;
  rights_notes: string | null;
  reviewed_at: Date | string | null;
  reviewed_by: string | null;
  approved_material_hash: string | null;
}

export interface EvaluatePublicationReadinessInput {
  work: ReadinessWorkInput;
  credits: ReadinessCreditInput[];
  visuals: ReadinessVisualInput[];
  glossary: ReadinessGlossaryInput[];
  visualRequests: ReadinessVisualRequestInput[];
  /** source_works row for this Work (derivative Works only need one). */
  sourceWork?: ReadinessSourceWorkInput | null;
  /** Contributor slugs that exist and are valid references. */
  knownContributorSlugs: Set<string>;
  /** True when another Work already owns this slug. */
  slugTakenByOther?: boolean;
}

const VALID_TYPES: ReadonlySet<string> = new Set([
  "cerpen",
  "novela",
  "bersiri",
  "terjemahan",
  "fragmen",
  "sinopsis",
]);

const VALID_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "review",
  "ready",
  "published",
  "archived",
]);

/** Statuses that allow the explicit publish action (published = idempotent re-check). */
const PUBLISHABLE_STATUSES: ReadonlySet<string> = new Set(["ready", "published"]);

const DERIVATIVE_TYPES: ReadonlySet<string> = new Set([
  "sinopsis",
  "terjemahan",
  "fragmen",
]);

/**
 * Visual requirement policy by Work type.
 * required → missing hero is a blocker (non-published Works).
 * recommended → missing hero is a warning only.
 * Grandfathered for already-published Works (downgraded to warnings).
 */
export const VISUAL_POLICY: Record<
  string,
  { hero: "required" | "recommended"; inline: "optional" }
> = {
  cerpen: { hero: "required", inline: "optional" },
  novela: { hero: "required", inline: "optional" },
  bersiri: { hero: "required", inline: "optional" },
  terjemahan: { hero: "recommended", inline: "optional" },
  fragmen: { hero: "recommended", inline: "optional" },
  sinopsis: { hero: "recommended", inline: "optional" },
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Rights states that permit publication (PASS). */
export const RIGHTS_PASS_STATUSES: ReadonlySet<string> = new Set([
  "public_domain",
  "licensed",
  "permission_obtained",
]);

/** Rights states that block publication (BLOCK). */
export const RIGHTS_BLOCK_STATUSES: ReadonlySet<string> = new Set([
  "unknown",
  "needs_review",
  "restricted",
  "rejected",
]);

export function isPassRightsStatus(status: string): boolean {
  return RIGHTS_PASS_STATUSES.has(String(status));
}

/** Transient / non-durable image sources that must never be canonical public src. */
const TRANSIENT_SRC_PATTERNS: RegExp[] = [
  /api\.magnific\.com/i,
  /cdn-magnific\.freepik\.com/i,
  /[?&]token=/i,
  /^\/assets\//i,
  /^file:\/\//i,
];

const PRIVACY_FORBIDDEN_SUBSTRINGS: string[] = [
  "prompt_composed",
  "x-magnific-api-key",
  "OBJECT_STORAGE_SECRET",
  "OBJECT_STORAGE_ACCESS_KEY",
  "api_key",
  "apikey",
  "secret_access_key",
  "bearer ",
  "webhook_secret",
];

const PENDING_REQUEST_STATUSES: ReadonlySet<string> = new Set([
  "draft",
  "queued",
  "generating",
  "generated",
  "under_review",
]);

function issue(code: string, message: string): ReadinessIssue {
  return { code, message };
}

function isTransientSrc(src: string): boolean {
  return TRANSIENT_SRC_PATTERNS.some((re) => re.test(src));
}

function finalizeGate(
  blockers: ReadinessIssue[],
  warnings: ReadinessIssue[]
): ReadinessGateResult {
  return { pass: blockers.length === 0, blockers, warnings };
}

function serializeEditorialHistory(history: unknown): string {
  if (typeof history === "string") return history;
  try {
    return JSON.stringify(history ?? "");
  } catch {
    return String(history);
  }
}

/** Stable hash of material provenance fields (shared with source-rights.ts). */
export function computeMaterialHash(row: {
  original_title: string | null;
  author: string | null;
  original_language: string | null;
  source_edition: string | null;
  source_url: string | null;
  source_locator: string | null;
  source_text_basis: string | null;
}): string {
  const payload = [
    (row.original_title ?? "").trim(),
    (row.author ?? "").trim(),
    (row.original_language ?? "").trim(),
    (row.source_edition ?? "").trim(),
    (row.source_url ?? "").trim(),
    (row.source_locator ?? "").trim(),
    (row.source_text_basis ?? "").trim(),
  ].join("\n");
  // djb2 (stable, dependency-free) — equality checks only, not crypto.
  let h = 5381;
  for (let i = 0; i < payload.length; i++) {
    h = ((h << 5) + h + payload.charCodeAt(i)) | 0;
  }
  return `djb2:${(h >>> 0).toString(16)}`;
}

function isValidSourceUrl(url: string | null | undefined): boolean {
  if (url === null || url === undefined || !String(url).trim()) return true;
  try {
    const u = new URL(String(url).trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Pure readiness evaluation. No I/O, no side effects, never mutates the Work.
 */
export function evaluatePublicationReadinessFromData(
  input: EvaluatePublicationReadinessInput,
  checkedAt: string = new Date().toISOString()
): PublicationReadiness {
  const { work, credits, visuals, glossary, visualRequests } = input;
  const alreadyPublished = work.status === "published";
  const grandfatherVisuals = alreadyPublished;

  const contentBlockers: ReadinessIssue[] = [];
  const contentWarnings: ReadinessIssue[] = [];
  const creditBlockers: ReadinessIssue[] = [];
  const creditWarnings: ReadinessIssue[] = [];
  const visualBlockers: ReadinessIssue[] = [];
  const visualWarnings: ReadinessIssue[] = [];
  const privacyBlockers: ReadinessIssue[] = [];
  const privacyWarnings: ReadinessIssue[] = [];
  const rightsBlockers: ReadinessIssue[] = [];
  const rightsWarnings: ReadinessIssue[] = [];
  const workflowBlockers: ReadinessIssue[] = [];
  const workflowWarnings: ReadinessIssue[] = [];

  // --- Content ---
  if (!work.id) {
    contentBlockers.push(issue("work_missing", "Work tidak ditemui."));
  }
  if (!VALID_STATUSES.has(String(work.status))) {
    contentBlockers.push(
      issue("status_invalid", `Status Work tidak sah: "${work.status}".`)
    );
  } else if (!PUBLISHABLE_STATUSES.has(String(work.status))) {
    contentBlockers.push(
      issue(
        "status_not_publishable",
        `Status "${work.status}" tidak membenarkan penerbitan. Perlu "ready" (atau sudah "published").`
      )
    );
  }
  if (!work.title || !work.title.trim()) {
    contentBlockers.push(issue("title_missing", "Tajuk kosong."));
  }
  if (!work.slug || !work.slug.trim()) {
    contentBlockers.push(issue("slug_missing", "Slug kosong."));
  } else if (!SLUG_RE.test(work.slug)) {
    contentBlockers.push(
      issue(
        "slug_invalid",
        `Slug "${work.slug}" tidak sah (huruf kecil, nombor, dan tanda hubung sahaja).`
      )
    );
  }
  if (input.slugTakenByOther) {
    contentBlockers.push(
      issue("slug_duplicate", `Slug "${work.slug}" sudah digunakan Work lain.`)
    );
  }
  if (!VALID_TYPES.has(String(work.type))) {
    contentBlockers.push(
      issue("type_invalid", `Jenis Work tidak sah: "${work.type}".`)
    );
  }
  if (!work.body || !work.body.trim()) {
    contentBlockers.push(issue("body_missing", "Manuskrip/body kosong."));
  }
  if (!work.dek || !work.dek.trim()) {
    contentWarnings.push(
      issue("dek_missing", "Dek/summary tiada — disyorkan untuk senarai awam.")
    );
  }
  if (DERIVATIVE_TYPES.has(String(work.type))) {
    contentWarnings.push(
      issue(
        "provenance_expected",
        "Karya derivative (Sinopsis/Terjemahan/Fragmen): butiran provenance sumber disemak melalui gate rights."
      )
    );
  }
  if (glossary.length === 0) {
    contentWarnings.push(
      issue("glossary_empty", "Glosari kosong — disyorkan mengikut model kandungan.")
    );
  }

  // --- Credits ---
  const publicCredits = credits.filter((c) => c.is_public);
  const bylineCredits = publicCredits.filter((c) => c.byline);

  if (credits.length === 0) {
    creditBlockers.push(issue("credits_missing", "Tiada kredit pada Work ini."));
  } else {
    for (const credit of credits) {
      const hasContributor = Boolean(credit.contributor_slug);
      const hasGuest = Boolean(credit.guest_name && credit.guest_name.trim());
      if (hasContributor && hasGuest) {
        creditBlockers.push(
          issue(
            "credit_identity_xor",
            `Kredit #${credit.id} mempunyai contributor_slug dan guest_name serentak (mesti XOR).`
          )
        );
      } else if (!hasContributor && !hasGuest) {
        creditBlockers.push(
          issue(
            "credit_identity_missing",
            `Kredit #${credit.id} tiada penyumbang (contributor atau guest).`
          )
        );
      }
      if (
        hasContributor &&
        credit.contributor_slug &&
        !input.knownContributorSlugs.has(credit.contributor_slug)
      ) {
        creditBlockers.push(
          issue(
            "credit_contributor_unknown",
            `Kredit #${credit.id} merujuk contributor "${credit.contributor_slug}" yang tidak wujud.`
          )
        );
      }
      if (!credit.role_label || !credit.role_label.trim()) {
        creditBlockers.push(
          issue("credit_role_missing", `Kredit #${credit.id} tiada label peranan.`)
        );
      }
    }
  }
  if (bylineCredits.length === 0 && credits.length > 0) {
    creditBlockers.push(
      issue(
        "byline_missing",
        "Tiada kredit awam bertanda byline — byline awam diperlukan sebelum terbit."
      )
    );
  }
  if (publicCredits.length > 0) {
    const orders = publicCredits.map((c) => c.sort_order);
    const sorted = [...orders].sort((a, b) => a - b);
    if (orders.some((o, i) => o !== sorted[i])) {
      creditWarnings.push(
        issue("credit_order", "Kredit awam tidak tersusun mengikut sort_order.")
      );
    }
  }
  const privateCount = credits.length - publicCredits.length;
  if (privateCount > 0) {
    creditWarnings.push(
      issue(
        "credits_private_excluded",
        `${privateCount} kredit peribadi tidak akan dipaparkan secara awam (dijangka).`
      )
    );
  }

  // --- Visuals ---
  const policy = VISUAL_POLICY[work.type] ?? { hero: "recommended", inline: "optional" };
  const heroVisuals = visuals.filter((v) => v.role === "hero");

  if (visuals.length === 0) {
    if (policy.hero === "required") {
      const msg = `Jenis "${work.type}" memerlukan visual hero.`;
      if (grandfatherVisuals) {
        visualWarnings.push(issue("hero_missing_grandfathered", `${msg} (grandfather — Work sudah terbit).`));
      } else {
        visualBlockers.push(issue("hero_missing", msg));
      }
    } else {
      visualWarnings.push(
        issue("hero_missing", `Tiada visual hero (disyorkan untuk jenis "${work.type}").`)
      );
    }
  } else {
    if (heroVisuals.length === 0) {
      if (policy.hero === "required") {
        const msg = `Tiada visual berperanan "hero" (diperlukan untuk "${work.type}").`;
        if (grandfatherVisuals) {
          visualWarnings.push(issue("hero_role_missing_grandfathered", `${msg} (grandfather).`));
        } else {
          visualBlockers.push(issue("hero_role_missing", msg));
        }
      } else {
        visualWarnings.push(issue("hero_role_missing", "Tiada visual hero (disyorkan)."));
      }
    }
  }

  for (const visual of visuals) {
    const label = `Visual #${visual.id}`;
    if (!visual.src || !visual.src.trim()) {
      visualBlockers.push(issue("visual_src_missing", `${label}: src kosong.`));
    } else if (isTransientSrc(visual.src)) {
      const msg = `${label}: src transient/non-durable (provider URL sementara atau path lokal) tidak dibenarkan sebagai canonical.`;
      if (grandfatherVisuals) {
        visualWarnings.push(issue("visual_src_transient_grandfathered", `${msg} (grandfather).`));
      } else {
        visualBlockers.push(issue("visual_src_transient", msg));
      }
    }
    const finalized = visual.is_asset_finalized === true;
    if (!finalized) {
      const msg = `${label}: is_asset_finalized ≠ true (aset belum durable).`;
      if (grandfatherVisuals) {
        visualWarnings.push(issue("visual_unfinalized_grandfathered", `${msg} (grandfather).`));
      } else {
        visualBlockers.push(issue("visual_unfinalized", msg));
      }
    }
    if (!visual.alt || !visual.alt.trim()) {
      const msg = `${label}: alt text kosong.`;
      if (grandfatherVisuals) {
        visualWarnings.push(issue("visual_alt_missing_grandfathered", `${msg} (grandfather).`));
      } else {
        visualBlockers.push(issue("visual_alt_missing", msg));
      }
    }
    const validRoles = ["hero", "inline", "section", "decorative"];
    if (!validRoles.includes(visual.role)) {
      const msg = `${label}: role "${visual.role}" tidak sah.`;
      if (grandfatherVisuals) {
        // Legacy published Works may carry scene-specific roles (e.g. inline-*).
        visualWarnings.push(issue("visual_role_invalid_grandfathered", `${msg} (grandfather).`));
      } else {
        visualBlockers.push(issue("visual_role_invalid", msg));
      }
    }
    const provider = (visual.provider || "").toLowerCase();
    if (provider === "magnific" && !visual.creation_id) {
      visualWarnings.push(
        issue("visual_provenance_missing", `${label}: provider magnific tanpa creation_id.`)
      );
    }
  }

  // --- Rights (source provenance gate) ---
  if (DERIVATIVE_TYPES.has(String(work.type))) {
    const src = input.sourceWork ?? null;
    if (!src) {
      rightsBlockers.push(
        issue(
          "source_missing",
          "Karya derivative memerlukan rekod source_works (provenance sumber) sebelum terbit."
        )
      );
    } else {
      const missing: string[] = [];
      if (!src.original_title || !src.original_title.trim()) missing.push("original_title");
      if (!src.author || !src.author.trim()) missing.push("author");
      if (!src.original_language || !src.original_language.trim()) missing.push("original_language");
      if (missing.length > 0) {
        rightsBlockers.push(
          issue(
            "source_incomplete",
            `Provenance sumber belum lengkap — medan kosong: ${missing.join(", ")}.`
          )
        );
      }
      if (!isValidSourceUrl(src.source_url)) {
        rightsBlockers.push(
          issue(
            "source_url_invalid",
            "source_url mesti http:// atau https:// (javascript:/file:/data: tidak dibenarkan)."
          )
        );
      }

      const status = String(src.rights_status || "unknown");
      const reviewed = Boolean(src.reviewed_at && src.reviewed_by);
      const currentHash = computeMaterialHash(src);
      const approvedHash = src.approved_material_hash;
      const stale = reviewed && approvedHash !== null && approvedHash !== currentHash;

      if (!RIGHTS_PASS_STATUSES.has(status)) {
        rightsBlockers.push(
          issue(
            "rights_not_approved",
            `Status hak "${status}" tidak membenarkan penerbitan. Perlu public_domain, licensed, atau permission_obtained.`
          )
        );
      } else if (!reviewed) {
        rightsBlockers.push(
          issue("rights_not_reviewed", "Status hak PASS tetapi tiada reviewed_by/reviewed_at (semakan manusia belum direkod).")
        );
      } else if (stale) {
        rightsBlockers.push(
          issue(
            "rights_stale_approval",
            "Kelulusan hak lapuk — provenance material berubah selepas semakan terakhir."
          )
        );
      } else if (status === "public_domain") {
        rightsWarnings.push(
          issue(
            "rights_public_domain_notice",
            "Domain awam pada asal tidak semestinya melindungi terjemahan moden — pastikan teks terjemahan berdasarkan sumber yang sah (lihat source_text_basis)."
          )
        );
      }
      if (status === "restricted" || status === "rejected") {
        if (!src.rights_notes || !src.rights_notes.trim()) {
          rightsBlockers.push(
            issue(
              "rights_notes_required",
              `rights_notes wajib untuk status "${status}".`
            )
          );
        }
      }
    }
  } else if (input.sourceWork) {
    rightsWarnings.push(
      issue(
        "source_work_non_derivative",
        "Rekod source_works wujud tetapi Work bukan jenis derivative — gate rights tidak aktif."
      )
    );
  }

  // --- Workflow (visual request state relevant to publication) ---
  const attachedCreationIds = new Set(
    visuals.map((v) => v.creation_id).filter(Boolean) as string[]
  );
  for (const req of visualRequests) {
    if (req.status === "rejected" && req.provider_creation_id && attachedCreationIds.has(req.provider_creation_id)) {
      workflowBlockers.push(
        issue(
          "visual_request_rejected_attached",
          `Visual request #${req.id} ditolak tetapi masih dipaut pada Work.`
        )
      );
    } else if (PENDING_REQUEST_STATUSES.has(req.status)) {
      workflowWarnings.push(
        issue(
          "visual_request_pending",
          `Visual request #${req.id} masih "${req.status}" (belum selesai).`
        )
      );
    } else if (req.status === "failed") {
      workflowWarnings.push(
        issue("visual_request_failed", `Visual request #${req.id} gagal.`)
      );
    }
  }

  // --- Privacy ---
  const privacyScanFields: string[] = [
    String(work.title ?? ""),
    String(work.dek ?? ""),
    String(work.genre ?? ""),
    String(work.audience ?? ""),
    String(work.version ?? ""),
    serializeEditorialHistory(work.editorial_history),
    ...credits.map((c) => c.role_label || ""),
    ...credits.map((c) => c.guest_name || ""),
  ];
  const scanBlob = privacyScanFields.join("\n");
  for (const needle of PRIVACY_FORBIDDEN_SUBSTRINGS) {
    if (scanBlob.toLowerCase().includes(needle.toLowerCase())) {
      privacyBlockers.push(
        issue(
          "privacy_forbidden_field",
          `Medan metadata mengandungi nilai terlarang ("${needle}").`
        )
      );
    }
  }
  // Public projection must not include internal request fields — structural check.
  const workKeys = Object.keys(work as unknown as Record<string, unknown>);
  const forbiddenKeys = [
    "prompt_composed",
    "provider_request_id",
    "source_asset_url",
    "error_message",
  ];
  for (const key of forbiddenKeys) {
    if (workKeys.includes(key)) {
      privacyBlockers.push(
        issue("privacy_internal_key", `Medan dalaman "${key}" tidak boleh wujud pada Work awam.`)
      );
    }
  }

  const gates: Record<ReadinessGateName, ReadinessGateResult> = {
    content: finalizeGate(contentBlockers, contentWarnings),
    credits: finalizeGate(creditBlockers, creditWarnings),
    visuals: finalizeGate(visualBlockers, visualWarnings),
    privacy: finalizeGate(privacyBlockers, privacyWarnings),
    rights: finalizeGate(rightsBlockers, rightsWarnings),
    workflow: finalizeGate(workflowBlockers, workflowWarnings),
  };

  const blockers = Object.values(gates).flatMap((g) => g.blockers);
  const warnings = Object.values(gates).flatMap((g) => g.warnings);

  return {
    ready: blockers.length === 0,
    blockers,
    warnings,
    gates,
    checkedAt,
  };
}
