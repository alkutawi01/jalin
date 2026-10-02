"use client";

import { isSourcedWork } from "@/lib/content/source-origin";
import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import WorkVisualUpload from "../../../../components/admin/WorkVisualUpload";
import { imageMarkers, insertImageMarker, isImageMarker } from "../../../../lib/reader/image-markers";
import CreditRoleSelect from "../../../../components/admin/CreditRoleSelect";
import AiCreditPicker from "../../../../components/admin/AiCreditPicker";
import { roleDisplay } from "../../../../lib/credit-roles";
import WorkStatusPanel from "../../../../components/admin/WorkStatusPanel";
import { toast, confirmAction } from "../../../../lib/admin/dialogs";
import LoadingBlock from "../../../../components/admin/LoadingBlock";
import StoryMarkdown from "../../../../components/reader/StoryMarkdown";
import { stripImageMarkers } from "../../../../lib/reader/image-markers";
import { classifyFragmen, isIndonesianLanguage, isMalayLanguage } from "../../../../lib/content/fragmen-kind";
import { buildGlossaryPrompt, parseGlossaryPaste } from "../../../../lib/admin/authoring/glossary-paste";
import { buildWorkFillPrompt, parseWorkFill } from "../../../../lib/admin/authoring/work-fill";
import { renderItalics, toggleItalicSelection } from "../../../../lib/reader/inline-italics";
import VisualManuscriptEditor, { canEditVisually } from "../../../../components/admin/VisualManuscriptEditor";

const WORK_TYPES = [
  { value: "cerpen", label: "Cerpen" },
  { value: "novela", label: "Novela" },
  { value: "bersiri", label: "Bersiri" },
  { value: "fragmen", label: "Fragmen" },
  { value: "sinopsis", label: "Sinopsis" },
];

const STATUSES = [
  { value: "draft", label: "Draf" },
  { value: "review", label: "Semakan" },
  { value: "ready", label: "Sedia" },
  { value: "published", label: "Diterbitkan" },
  { value: "archived", label: "Arkib" },
];

/** Statuses selectable in the metadata dropdown (published only via explicit Publish). */
const EDITABLE_STATUSES = STATUSES.filter((s) => s.value !== "published");

interface WorkData {
  id: string;
  slug: string;
  title: string;
  type: string;
  status: string;
  body: string;
  genre: string | null;
  audience: string | null;
  dek: string | null;
  reading_minutes: number | null;
  version: string;
  version_label?: string | null;
  published_at: string | null;
  published_by?: string | null;
  updated_at: string;
  metadata?: { editorNote?: string; origin?: string } | null;
}

interface ReadinessIssue {
  code: string;
  message: string;
}

interface ReadinessGate {
  pass: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
}

interface ReadinessData {
  ready: boolean;
  blockers: ReadinessIssue[];
  warnings: ReadinessIssue[];
  gates: Record<"content" | "credits" | "visuals" | "privacy" | "rights" | "structure" | "workflow", ReadinessGate>;
  checkedAt: string;
  unpublished?: { snapshotMissing: boolean; changed: boolean } | null;
}

interface CreditData {
  id: number;
  work_id: string;
  contributor_slug: string | null;
  guest_name: string | null;
  role_label: string;
  byline: boolean;
  is_public: boolean;
  sort_order: number;
}

interface ContributorOption {
  slug: string;
  display_name: string;
  kind?: string;
}

interface VisualData {
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
}

function WorkImageCard({ visual, body, onEdit, onReplace, onDelete }: {
  visual: VisualData;
  body: string;
  onEdit: (visual: VisualData) => void;
  onReplace: (id: number, file: File) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <article className="work-image-card">
      <a className="work-image-card-preview" href={visual.src} target="_blank" rel="noreferrer" title="Buka gambar saiz penuh">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={visual.src} alt={visual.alt || ""} />
      </a>
      <div className="work-image-card-detail">
        <strong>{visual.role === "hero" ? "Gambar utama" : "Gambar dalam teks"}</strong>
        <p>{visual.alt || "Teks alternatif belum diisi."}</p>
        {visual.role !== "hero" ? (
          <p className="admin-form-hint">
            {!visual.anchor ? "Tiada penanda — gambar tidak muncul dalam karya."
              : isImageMarker(visual.anchor)
                ? body.includes(visual.anchor) ? `Penanda ${visual.anchor} · alihkan penanda dalam manuskrip untuk memindahkan gambar.` : `Penanda ${visual.anchor} tiada dalam manuskrip tersimpan — gambar tidak muncul.`
                : body.includes(visual.anchor) ? `Penanda lama pada petikan: “${visual.anchor.slice(0, 90)}${visual.anchor.length > 90 ? "…" : ""}”. Tukar kepada penanda supaya suntingan teks tidak mengalihkan gambar.` : "Petikan anchor lama tidak ditemui — pilih penanda gambar baharu."}
          </p>
        ) : <p className="admin-form-hint">Dipaparkan pada kad dan kepala halaman karya.</p>}
        <div className="work-image-card-actions">
          <button type="button" className="admin-btn admin-btn-sm" onClick={() => onEdit(visual)}>Ubah butiran</button>
          <label className="admin-btn admin-btn-sm" style={{ cursor: "pointer" }}>
            Ganti gambar
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onReplace(visual.id, file);
            }} />
          </label>
          <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" onClick={() => onDelete(visual.id)}>Padam</button>
        </div>
      </div>
    </article>
  );
}

interface GlossaryData {
  id: number;
  work_id: string;
  term: string;
  meaning: string;
  source: string;
  sort_order: number;
}

/**
 * Character metadata (Content Model Readiness audit). Stored as one
 * JSON array in works.metadata.characters, not individual DB rows —
 * so unlike credits/visuals/glossary there's no per-row id; the whole
 * list is read and replaced together.
 */
interface CharacterEntry {
  name: string;
  role: string;
  firstAppearanceSection: string | null;
}

type Tab = "content" | "metadata" | "sections" | "credits" | "glossary" | "characters" | "source";
const TABS: readonly Tab[] = ["content", "metadata", "sections", "credits", "glossary", "characters", "source"];

interface SectionData {
  id: number;
  work_id: string;
  slug: string;
  title: string | null;
  position: number;
  body: string;
  reading_minutes: number | null;
}

const isSourced = (type: string, origin: string) => isSourcedWork(type, { origin });

const TAB_NAMES: Record<Tab, string> = {
  content: "Kandungan", metadata: "Maklumat", sections: "Bahagian", credits: "Kredit", glossary: "Glosari", characters: "Watak", source: "Sumber & Hak"
};

const HISTORY_ACTIONS: Record<string, string> = {
  review: "Semakan hak",
  provenance_edit: "Butiran sumber diubah",
  text_review: "Pengesahan bahasa teks"
};

const RIGHTS_STATUS_OPTIONS = [
  { value: "unknown", label: "Belum diketahui" },
  { value: "needs_review", label: "Perlu semakan" },
  { value: "public_domain", label: "Domain awam" },
  { value: "licensed", label: "Berlesen" },
  { value: "permission_obtained", label: "Kebenaran diperoleh" },
  { value: "restricted", label: "Disekat" },
  { value: "rejected", label: "Ditolak" },
];

interface SourceRightsData {
  workId: string;
  isDerivative: boolean;
  chatbotFilledFields?: string[];
  fragmenTextLanguage: string | null;
  fragmenTextReview?: { reviewedBy: string; reviewedAt: string; current: boolean } | null;
  sourceWork: {
    id: number;
    originalTitle: string | null;
    author: string | null;
    originalLanguage: string | null;
    publicationYear: number | null;
    sourceEdition: string | null;
    sourceUrl: string | null;
    sourceLocator: string | null;
    sourceTextBasis: string | null;
    publisher: string | null;
    editionYear: number | null;
    printing: string | null;
    editorName: string | null;
    translatorName: string | null;
    isbn: string | null;
    rightsStatus: string;
    rightsNotes: string | null;
    rightsEvidence: string | null;
    reviewedAt: string | null;
    reviewedBy: string | null;
    updatedAt: string;
  } | null;
  rightsHistory: {
    at: string;
    actor: string;
    action: string;
    rights_status: string;
    note?: string;
  }[];
  rightsReady: boolean;
  rightsBlockers: ReadinessIssue[];
}

export default function EditWorkPage() {
  const router = useRouter();
  const params = useParams();
  const workId = params.id as string;

  const [activeTab, setActiveTab] = useState<Tab>("content");
  const manuscriptRef = useRef<HTMLTextAreaElement>(null);
  const [selectedImageAnchor, setSelectedImageAnchor] = useState("");
  const [savedBody, setSavedBody] = useState("");
  const [positionError, setPositionError] = useState("");
  const [showManuscriptPreview, setShowManuscriptPreview] = useState(false);
  const [manuscriptMode, setManuscriptMode] = useState<"markdown" | "visual">("visual");
  const [assistantNote, setAssistantNote] = useState("");
  const [glossaryBusy, setGlossaryBusy] = useState(false);
  const [fillBusy, setFillBusy] = useState(false);
  const [fillNote, setFillNote] = useState<string[]>([]);
  const [selectedTerms, setSelectedTerms] = useState<number[]>([]);
  const [glossaryNote, setGlossaryNote] = useState("");
  useEffect(() => {
    const restoreTab = () => {
      const hash = window.location.hash.slice(1);
      if (hash === "visuals") setActiveTab("content");
      else if (TABS.includes(hash as Tab)) setActiveTab(hash as Tab);
    };
    restoreTab();
    window.addEventListener("hashchange", restoreTab);
    return () => window.removeEventListener("hashchange", restoreTab);
  }, []);
  function selectTab(tab: Tab) {
    setActiveTab(tab);
    window.history.replaceState(window.history.state, "", `#${tab}`);
  }
  async function copyAssistantPrompt() {
    const focus = activeTab === "content" ? "semak struktur dan kelancaran manuskrip tanpa menulis semula karya"
      : activeTab === "metadata" ? "cadangkan dek, genre dan minit bacaan berdasarkan manuskrip"
      : activeTab === "credits" ? "senaraikan peranan kredit yang benar-benar dibuktikan oleh maklumat diberi; jangan reka penyumbang"
      : activeTab === "glossary" ? "cadangkan istilah yang benar-benar hadir dalam manuskrip serta maksud ringkas"
      : activeTab === "characters" ? "senaraikan watak yang benar-benar hadir, peranan, dan kemunculan pertama tanpa spoiler"
      : activeTab === "source" ? "susun maklumat sumber dan bukti hak yang editor berikan; jangan mendakwa status domain awam tanpa bukti"
      : "semak struktur bahagian tanpa mengubah urutan cerita";
    const prompt = `Anda pembantu editorial Jalin. Jenis karya: ${form.type}. Tugas: ${focus}. Jawab dalam bahasa Melayu dengan butiran yang mudah dipindahkan ke tab ${activeTab}. Jangan mereka fakta, kredit, sumber atau peristiwa. Tanda maklumat yang tidak dapat disahkan sebagai 'perlu semakan editor'. ${form.type === "bersiri" ? "Episod ini sebahagian siri; minta ringkasan episod terdahulu dan nota canon jika belum diberi. Jangan anggap episod berdiri sendiri." : ""}\n\nMANUSKRIP:\n${form.body.trim() || "[Editor akan tampal manuskrip]"}`;
    try {
      await navigator.clipboard.writeText(prompt);
      setAssistantNote("Arahan untuk tab ini telah disalin. Semak cadangan chatbot sebelum memasukkannya ke editor.");
    } catch {
      setAssistantNote("Salin gagal. Benarkan akses papan keratan dalam pelayar dan cuba lagi.");
    }
  }
  /** Ctrl+I (or Cmd+I) italicises the selection with *asterisks*; nothing is italicised automatically. */
  function italicShortcut(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, field: "term" | "meaning") {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "i") return;
    event.preventDefault();
    const el = event.currentTarget;
    const next = toggleItalicSelection(el.value, el.selectionStart ?? 0, el.selectionEnd ?? 0);
    setEditingGlossary((prev) => (prev ? { ...prev, [field]: next.value } : prev));
    requestAnimationFrame(() => {
      el.setSelectionRange(next.selectionStart, next.selectionEnd);
    });
  }

  async function deleteSelectedGlossary() {
    const ids = selectedTerms;
    if (ids.length === 0) return;
    if (!(await confirmAction(`Padam ${ids.length} istilah glosari yang dipilih? Tindakan ini tidak boleh dibatalkan.`, { danger: true, confirmLabel: `Padam ${ids.length} istilah` }))) return;
    setGlossaryBusy(true);
    setGlossaryError(null);
    let removed = 0;
    try {
      for (const id of ids) {
        const res = await fetch(`/api/admin/glossary/${id}`, { method: "DELETE" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Gagal memadam istilah glosari.");
        }
        removed += 1;
      }
      toast(`${removed} istilah glosari dipadam.`, "success");
    } catch (err) {
      setGlossaryError(`${err instanceof Error ? err.message : "Ralat tidak diketahui."} (${removed} daripada ${ids.length} sempat dipadam.)`);
    } finally {
      setSelectedTerms([]);
      setGlossaryBusy(false);
      await loadGlossary();
      await loadReadiness();
    }
  }

  /** One copy: everything a chatbot may suggest, with the manuscript. */
  async function copyFillPrompt() {
    const prompt = buildWorkFillPrompt({
      type: form.type,
      body: form.body,
      glossaryTerms: glossaryTerms.map((term) => term.term),
      characterNames: characters.map((c) => c.name),
      chapterSlugs: form.type === "novela" ? sections.map((section) => section.slug) : [],
      origin: form.origin
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setFillNote(["Arahan disalin. Tampal ke chatbot, kemudian salin seluruh jawapannya dan tekan Tampal & isi."]);
      toast("Arahan disalin.", "success");
    } catch {
      setFillNote(["Salin gagal. Benarkan akses papan keratan dalam pelayar dan cuba lagi."]);
    }
  }

  /**
   * One paste: read the chatbot's whole answer and fill the empty parts of the work. The chatbot only
   * helps: nothing the editor already wrote is overwritten, and credits, images, rights and the
   * manuscript are never touched.
   */
  async function pasteFillFromClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setFillNote(["Pelayar menyekat bacaan papan keratan. Klik ikon tetapan di sebelah alamat laman, benarkan \"Papan keratan\" untuk laman ini, kemudian tekan Tampal & isi semula."]);
      return;
    }
    if (!text.trim()) {
      setFillNote(["Papan keratan kosong. Salin jawapan chatbot dahulu."]);
      return;
    }
    const result = parseWorkFill(text);
    if (result.sections.length === 0) {
      setFillNote(["Tiada bahagian [MAKLUMAT], [WATAK], [GLOSARI] atau [SUMBER] ditemui. Pastikan anda menyalin seluruh jawapan chatbot."]);
      return;
    }
    setFillBusy(true);
    const notes: string[] = [];
    try {
      // 1) dek and genre: only into empty fields
      const patch: Record<string, string> = {};
      if (result.dek) {
        if (form.dek.trim()) notes.push("Dek: sudah ada, tidak diganti.");
        else patch.dek = result.dek;
      }
      if (result.genre) {
        if (form.genre.trim()) notes.push("Genre: sudah ada, tidak diganti.");
        else patch.genre = result.genre;
      }
      if (Object.keys(patch).length > 0) {
        const res = await fetch(`/api/admin/works/${workId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch)
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal menyimpan maklumat.");
        setForm((prev) => ({ ...prev, ...patch }));
        notes.push(`Maklumat: ${Object.keys(patch).map((k) => (k === "dek" ? "dek" : "genre")).join(" dan ")} diisi.`);
      }

      // 2) characters: add new names, keep every existing one
      if (result.sections.includes("WATAK")) {
        const have = new Set(characters.map((c) => c.name.toLocaleLowerCase("ms")));
        const slugs = new Set(sections.map((section) => section.slug));
        const fresh = result.characters.filter((c) => !have.has(c.name.toLocaleLowerCase("ms")));
        if (fresh.length > 0) {
          const res = await fetch(`/api/admin/works/${workId}/characters`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              characters: [
                ...characters,
                ...fresh.map((c) => ({ name: c.name, role: c.role, firstAppearanceSection: form.type === "novela" && slugs.has(c.first) ? c.first : null }))
              ]
            })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal menyimpan watak.");
          notes.push(`Watak: ${fresh.length} ditambah${result.characters.length > fresh.length ? `, ${result.characters.length - fresh.length} sudah ada` : ""}.`);
        } else {
          notes.push(result.characters.length ? "Watak: semua sudah ada." : "Watak: tiada cadangan.");
        }
      }

      // 3) glossary: same rules as the glossary tab
      if (result.sections.includes("GLOSARI")) {
        const g = parseGlossaryPaste(result.glossaryText, form.body, glossaryTerms.map((term) => term.term));
        if (g.none) {
          notes.push("Glosari: chatbot menilai tiada istilah sukar.");
        } else {
          let added = 0;
          for (const [index, item] of g.items.entries()) {
            const res = await fetch("/api/admin/glossary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workId, term: item.term, meaning: item.meaning, source: "", sortOrder: glossaryTerms.length + index + 1 })
            });
            if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Gagal menambah istilah "${item.term}".`);
            added += 1;
          }
          const skipped = [
            g.existing.length ? `${g.existing.length} sudah ada` : "",
            g.notInText.length ? `${g.notInText.length} tiada dalam manuskrip` : "",
            g.unreadable ? `${g.unreadable} tidak dapat dibaca` : ""
          ].filter(Boolean).join(", ");
          notes.push(`Glosari: ${added} istilah ditambah${skipped ? ` (dilangkau: ${skipped})` : ""}.`);
        }
      }

      // 4) source (fragmen, sinopsis): only empty fields; rights are never filled
      if (result.source && isSourced(form.type, form.origin)) {
        const cur = await fetch(`/api/admin/works/${workId}/source-rights`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const sw = cur?.sourceWork ?? {};
        const body: Record<string, string | number> = {};
        const filled: string[] = [];
        const put = (key: string, value: string | number | null | undefined, current: unknown) => {
          if (value === null || value === undefined || value === "") return;
          if (current !== null && current !== undefined && String(current).trim() !== "") return;
          body[key] = value;
          filled.push(key);
        };
        put("originalTitle", result.source.title, sw.originalTitle);
        put("author", result.source.author, sw.author);
        put("originalLanguage", result.source.language, sw.originalLanguage);
        put("sourceTextBasis", result.source.basis, sw.sourceTextBasis);
        put("publicationYear", result.source.firstPublished, sw.publicationYear);
        put("publisher", result.source.publisher, sw.publisher);
        put("editionYear", result.source.editionYear, sw.editionYear);
        put("printing", result.source.printing, sw.printing);
        put("editorName", result.source.editor, sw.editorName);
        put("translatorName", result.source.translator, sw.translatorName);
        put("isbn", result.source.isbn, sw.isbn);
        put("sourceLocator", result.source.locator, sw.sourceLocator);
        if (Object.keys(body).length > 0) {
          const res = await fetch(`/api/admin/works/${workId}/source-rights`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...body, chatbotFields: filled })
          });
          if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Gagal menyimpan sumber.");
          notes.push(`Sumber: ${Object.keys(body).length} medan diisi. Medan yang chatbot tidak tahu dibiarkan kosong. Hak dan bukti tidak diisi; semak di tab Sumber & Hak.`);
        } else {
          notes.push("Sumber: tiada medan kosong untuk diisi.");
        }
      }
      notes.push("Tidak disentuh: teks karya, kredit, imej dan hak. Semak semua isi sebelum menerbitkan.");
      toast("Maklumat daripada chatbot telah diisi.", "success");
    } catch (err) {
      notes.push(`Berhenti kerana ralat: ${err instanceof Error ? err.message : "ralat tidak diketahui"}. Bahagian sebelumnya sudah disimpan.`);
    } finally {
      setFillNote(notes);
      setFillBusy(false);
      await Promise.all([loadGlossary(), loadCharacters(), loadSourceRights(), loadReadiness()]);
    }
  }

  async function copyGlossaryPrompt() {
    const prompt = buildGlossaryPrompt({
      type: form.type,
      body: form.body,
      existingTerms: glossaryTerms.map((term) => term.term)
    });
    try {
      await navigator.clipboard.writeText(prompt);
      setGlossaryNote("Arahan glosari sudah disalin. Tampal ke chatbot, kemudian salin jawapannya dan tekan Tampal & import.");
      toast("Arahan glosari disalin.", "success");
    } catch {
      setGlossaryNote("Salin gagal. Benarkan akses papan keratan dalam pelayar dan cuba lagi.");
    }
  }

  /** Parse the chatbot's answer and add every new term in one go. */
  async function importGlossaryText(answer: string) {
    setGlossaryError(null);
    if (!answer.trim()) {
      setGlossaryNote("Tiada teks untuk dibaca. Salin jawapan chatbot dahulu.");
      return;
    }
    const result = parseGlossaryPaste(answer, form.body, glossaryTerms.map((term) => term.term));
    if (result.none) {
      setGlossaryNote("Chatbot menilai tiada istilah sukar dalam karya ini. Tiada apa-apa ditambah.");
      return;
    }
    if (result.items.length === 0) {
      const why = [
        result.existing.length ? `${result.existing.length} sudah ada` : "",
        result.notInText.length ? `${result.notInText.length} tiada dalam manuskrip (${result.notInText.join(", ")})` : "",
        result.unreadable ? `${result.unreadable} tidak dapat dibaca` : ""
      ].filter(Boolean).join("; ");
      setGlossaryNote(`Tiada istilah baharu untuk ditambah${why ? `: ${why}` : "."}`);
      return;
    }
    setGlossaryBusy(true);
    let added = 0;
    try {
      for (const [index, item] of result.items.entries()) {
        const res = await fetch("/api/admin/glossary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workId, term: item.term, meaning: item.meaning, source: "", sortOrder: glossaryTerms.length + index + 1 })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Gagal menambah "${item.term}".`);
        }
        added += 1;
      }
      const skipped = [
        result.existing.length ? `${result.existing.length} sudah ada` : "",
        result.notInText.length ? `${result.notInText.length} tiada dalam manuskrip (${result.notInText.join(", ")})` : "",
        result.unreadable ? `${result.unreadable} tidak dapat dibaca` : ""
      ].filter(Boolean).join("; ");
      setGlossaryNote(`${added} istilah ditambah${skipped ? `. Dilangkau: ${skipped}` : ""}. Semak maksudnya dalam jadual dan edit jika perlu.`);
      toast(`${added} istilah glosari ditambah.`, "success");
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      if (added > 0) setGlossaryNote(`${added} istilah sempat ditambah sebelum ralat.`);
    } finally {
      setGlossaryBusy(false);
      await loadGlossary();
      await loadReadiness();
    }
  }

  async function pasteGlossaryFromClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setGlossaryNote("Pelayar menyekat bacaan papan keratan. Klik ikon tetapan di sebelah alamat laman, benarkan \"Papan keratan\" untuk laman ini, kemudian tekan Tampal & import semula.");
      return;
    }
    if (!text.trim()) {
      setGlossaryNote("Papan keratan kosong. Salin jawapan chatbot dahulu.");
      return;
    }
    await importGlossaryText(text);
  }

  function chooseImagePosition() {
    const textarea = manuscriptRef.current;
    if (!textarea) return;
    const insertion = insertImageMarker(form.body, textarea.selectionStart, visuals.map((visual) => visual.anchor));
    if (!insertion) {
      setPositionError("Letakkan kursor pada perenggan yang mengandungi teks dahulu.");
      return;
    }
    setPositionError("");
    setForm((prev) => ({ ...prev, body: insertion.body }));
    setDirty(true);
    setSelectedImageAnchor(insertion.marker);
    toast(`Penanda ${insertion.marker} disisipkan. Simpan teks & maklumat sebelum memuat naik gambar.`, "success");
  }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    slug: "",
    type: "cerpen",
    status: "draft",
    body: "",
    genre: "",
    audience: "",
    dek: "",
    readingMinutes: "",
    version: "v0.1",
    publishedAt: "",
    editorNote: "",
    origin: "asli",
  });

  const [credits, setCredits] = useState<CreditData[]>([]);
  const [contributors, setContributors] = useState<ContributorOption[]>([]);
  // A credit is either to a human or to an AI (shown under its pseudonym); the form never mixes the two.
  const [creditKind, setCreditKind] = useState<"manusia" | "ai">("manusia");
  const isAiSlug = (slug: string | null | undefined) => contributors.find((c) => c.slug === slug)?.kind === "virtual";
  const [editingCredit, setEditingCredit] = useState<Partial<CreditData> | null>(null);
  const [creditError, setCreditError] = useState<string | null>(null);

  const [visuals, setVisuals] = useState<VisualData[]>([]);
  const [markerMigration, setMarkerMigration] = useState<{ plan: { originalBody: string; body: string; changes: { id: number; from: string; to: string }[]; skipped: { id: number; reason: string }[] }; canRestore: boolean } | null>(null);
  const [markerMigrationBusy, setMarkerMigrationBusy] = useState(false);
  const [markerMigrationError, setMarkerMigrationError] = useState("");
  const [editingVisual, setEditingVisual] = useState<Partial<VisualData> | null>(null);
  const [visualError, setVisualError] = useState<string | null>(null);

  const [glossaryTerms, setGlossaryTerms] = useState<GlossaryData[]>([]);
  const [editingGlossary, setEditingGlossary] = useState<Partial<GlossaryData> | null>(null);
  const [glossaryError, setGlossaryError] = useState<string | null>(null);

  const [characters, setCharacters] = useState<CharacterEntry[]>([]);
  const [charactersError, setCharactersError] = useState<string | null>(null);
  const [charactersSuccess, setCharactersSuccess] = useState<string | null>(null);
  const [charactersSaving, setCharactersSaving] = useState(false);

  const [sections, setSections] = useState<SectionData[]>([]);
  const [editingSection, setEditingSection] = useState<Partial<SectionData> | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);
  const [sectionSuccess, setSectionSuccess] = useState<string | null>(null);

  const [publishPreview, setPublishPreview] = useState<{
    isNew: boolean;
    currentExists: boolean;
    slugCollision: boolean;
    metadataChanged: boolean;
    bodyChanged: boolean;
  } | null>(null);
  const [publishing, setPublishing] = useState(false);
  // Markdown sync writes files in the project folder; it is only meaningful on a developer machine.
  const [isLocalHost, setIsLocalHost] = useState(false);
  useEffect(() => {
    setIsLocalHost(/^(localhost|127.0.0.1)$/.test(window.location.hostname));
  }, []);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);

  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [readinessError, setReadinessError] = useState<string | null>(null);

  const [sourceRights, setSourceRights] = useState<SourceRightsData | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [sourceSuccess, setSourceSuccess] = useState<string | null>(null);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    fragmenTextLanguage: "",
    originalTitle: "",
    author: "",
    originalLanguage: "",
    publicationYear: "",
    sourceEdition: "",
    sourceUrl: "",
    sourceLocator: "",
    sourceTextBasis: "",
    publisher: "",
    editionYear: "",
    printing: "",
    editorName: "",
    translatorName: "",
    isbn: "",
    rightsNotes: "",
    rightsEvidence: "",
    rightsStatus: "needs_review",
  });

  useEffect(() => {
    async function loadWork() {
      try {
        const res = await fetch(`/api/admin/works/${workId}`);
        if (!res.ok) throw new Error("Karya tidak ditemui.");
        const work: WorkData = await res.json();
        setManuscriptMode(canEditVisually(work.body || "") ? "visual" : "markdown");

        setForm({
          title: work.title,
          slug: work.slug,
          type: work.type,
          status: work.status,
          body: work.body || "",
          genre: work.genre || "",
          audience: work.audience || "",
          dek: work.dek || "",
          readingMinutes: work.reading_minutes?.toString() || "",
          version: work.version_label || work.version,
          publishedAt: work.published_at ? work.published_at.split("T")[0] : "",
          editorNote: work.metadata?.editorNote ?? "",
          origin: work.metadata?.origin === "sumber" ? "sumber" : "asli",
        });
        setSavedBody(work.body || "");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat memuatkan karya.");
      } finally {
        setLoading(false);
      }
    }

    loadWork();
    loadCredits();
    loadContributors();
    loadVisuals();
    loadGlossary();
    loadCharacters();
    loadReadiness();
    loadSourceRights();
    loadSections();
  }, [workId]);

  async function loadSections() {
    try {
      const res = await fetch(`/api/admin/works/${workId}/sections`);
      if (res.ok) {
        setSections(await res.json());
      }
    } catch {
      // Ignore section loading errors
    }
  }

  async function handleSaveSection() {
    if (!editingSection) return;
    setSectionError(null);
    setSectionSuccess(null);
    try {
      if (editingSection.id) {
        const res = await fetch(`/api/admin/works/${workId}/sections/${editingSection.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingSection),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan bahagian.");
        }
      } else {
        const res = await fetch(`/api/admin/works/${workId}/sections`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingSection),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta bahagian.");
        }
      }
      setEditingSection(null);
      setSectionSuccess("Bahagian disimpan.");
      await loadSections();
      await loadReadiness();
      setTimeout(() => setSectionSuccess(null), 4000);
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteSection(id: number) {
    if (!(await confirmAction("Pasti ingin memadam bahagian ini? Susunan selebihnya akan dirapatkan.", { danger: true, confirmLabel: "Ya, teruskan" }))) return;
    setSectionError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/sections/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam bahagian.");
      }
      await loadSections();
      await loadReadiness();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleMoveSection(index: number, direction: -1 | 1) {
    const ids = sections.map((s) => s.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setSectionError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/sections/reorder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionIds: ids }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyusun semula.");
      }
      await loadSections();
      await loadReadiness();
    } catch (err) {
      setSectionError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function confirmMalayText(confirmed: boolean) {
    setSourceError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights/text-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan pengesahan bahasa.");
      await loadSourceRights();
      await loadReadiness();
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function loadSourceRights() {
    setSourceLoading(true);
    setSourceError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal memuatkan maklumat sumber karya.");
      }
      const data: SourceRightsData = await res.json();
      setSourceRights(data);
      if (data.sourceWork) {
        setSourceForm({
          fragmenTextLanguage: data.fragmenTextLanguage || "",
          originalTitle: data.sourceWork.originalTitle || "",
          author: data.sourceWork.author || "",
          originalLanguage: data.sourceWork.originalLanguage || "",
          publicationYear: data.sourceWork.publicationYear?.toString() || "",
          sourceEdition: data.sourceWork.sourceEdition || "",
          sourceUrl: data.sourceWork.sourceUrl || "",
          sourceLocator: data.sourceWork.sourceLocator || "",
          sourceTextBasis: data.sourceWork.sourceTextBasis || "",
          publisher: data.sourceWork.publisher || "",
          editionYear: data.sourceWork.editionYear?.toString() || "",
          printing: data.sourceWork.printing || "",
          editorName: data.sourceWork.editorName || "",
          translatorName: data.sourceWork.translatorName || "",
          isbn: data.sourceWork.isbn || "",
          rightsNotes: data.sourceWork.rightsNotes || "",
          rightsEvidence: data.sourceWork.rightsEvidence || "",
          rightsStatus: data.sourceWork.rightsStatus || "needs_review",
        });
      }
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceLoading(false);
    }
  }

  /** Small tag beside a field the chatbot filled in and no editor has reviewed yet. */
  const tagFor = (key: string) => ((sourceRights?.chatbotFilledFields ?? []).includes(key) ? <em className="admin-form-hint">(dicadangkan chatbot)</em> : null);

  async function handleSaveProvenance() {
    setSourceSaving(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.type === "fragmen" ? { fragmenTextLanguage: sourceForm.fragmenTextLanguage } : {}),
          originalTitle: sourceForm.originalTitle || null,
          author: sourceForm.author || null,
          originalLanguage: sourceForm.originalLanguage || null,
          publicationYear: sourceForm.publicationYear ? Number(sourceForm.publicationYear) : null,
          sourceEdition: sourceForm.sourceEdition || null,
          sourceUrl: sourceForm.sourceUrl || null,
          sourceLocator: sourceForm.sourceLocator || null,
          sourceTextBasis: sourceForm.sourceTextBasis || null,
          publisher: sourceForm.publisher || null,
          editionYear: sourceForm.editionYear ? Number(sourceForm.editionYear) : null,
          printing: sourceForm.printing || null,
          editorName: sourceForm.editorName || null,
          translatorName: sourceForm.translatorName || null,
          isbn: sourceForm.isbn || null,
          rightsNotes: sourceForm.rightsNotes || null,
          rightsEvidence: sourceForm.rightsEvidence || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan maklumat sumber.");
      setSourceSuccess(
        data.invalidatedApproval
          ? "Provenance disimpan — kelulusan hak direset ke needs_review kerana material berubah."
          : "Provenance disimpan."
      );
      await loadSourceRights();
      await loadReadiness();
      setTimeout(() => setSourceSuccess(null), 5000);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceSaving(false);
    }
  }

  async function handleRightsReview() {
    if (["public_domain", "licensed", "permission_obtained"].includes(sourceForm.rightsStatus) && !sourceForm.rightsNotes.trim()) {
      setSourceError("Nyatakan asas keputusan hak sebelum merekod kelulusan.");
      document.getElementById("src-notes")?.focus();
      return;
    }
    setSourceSaving(true);
    setSourceError(null);
    setSourceSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/source-rights/rights-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.type === "fragmen" ? { fragmenTextLanguage: sourceForm.fragmenTextLanguage } : {}),
          rights_status: sourceForm.rightsStatus,
          rights_notes: sourceForm.rightsNotes || null,
          rights_evidence: sourceForm.rightsEvidence || null,
          originalTitle: sourceForm.originalTitle || null,
          author: sourceForm.author || null,
          originalLanguage: sourceForm.originalLanguage || null,
          publicationYear: sourceForm.publicationYear ? Number(sourceForm.publicationYear) : null,
          sourceEdition: sourceForm.sourceEdition || null,
          sourceUrl: sourceForm.sourceUrl || null,
          sourceLocator: sourceForm.sourceLocator || null,
          sourceTextBasis: sourceForm.sourceTextBasis || null,
          publisher: sourceForm.publisher || null,
          editionYear: sourceForm.editionYear ? Number(sourceForm.editionYear) : null,
          printing: sourceForm.printing || null,
          editorName: sourceForm.editorName || null,
          translatorName: sourceForm.translatorName || null,
          isbn: sourceForm.isbn || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyemak hak.");
      setSourceSuccess(
        `Semakan hak direkod (oleh ${data.sourceWork?.reviewedBy ?? "admin"}).`
      );
      await loadSourceRights();
      await loadReadiness();
      setTimeout(() => setSourceSuccess(null), 5000);
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSourceSaving(false);
    }
  }

  async function loadReadiness() {
    setReadinessLoading(true);
    setReadinessError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/publication-readiness`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Gagal menyemak kesediaan terbit.");
      }
      setReadiness(await res.json());
    } catch (err) {
      setReadinessError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setReadinessLoading(false);
    }
  }

  async function handleExplicitPublish() {
    if (dirty) {
      setPublishError("Ada perubahan teks atau maklumat yang belum disimpan. Tekan Simpan teks & maklumat dahulu, kemudian terbitkan.");
      return;
    }
    if (!(await confirmAction("Terbitkan karya ini kepada pembaca? Karya akan kelihatan di laman awam."))) return;
    await doPublish();
  }

  async function republishNow() {
    if (dirty) {
      setPublishError("Ada perubahan teks atau maklumat yang belum disimpan. Tekan Simpan teks & maklumat dahulu, kemudian terbitkan semula.");
      return;
    }
    if (!(await confirmAction("Terbitkan semula? Pembaca akan terus melihat versi draf ini."))) return;
    setPublishing(true);
    setPublishError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ republish: true, summary: "Kemas kini diterbitkan", changeType: "minor" })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan semula.");
      setPublishSuccess(data.changed ? "Versi baharu diterbitkan. Pembaca kini melihatnya." : "Tiada perubahan untuk diterbitkan.");
      toast(data.changed ? "Versi baharu diterbitkan. Pembaca kini melihatnya." : "Tiada perubahan untuk diterbitkan.", "success");
      await loadReadiness();
      setTimeout(() => setPublishSuccess(null), 5000);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setPublishing(false);
    }
  }

  async function doPublish() {
    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menerbitkan.");
      }
      setPublishSuccess(
        data.alreadyPublished
          ? "Karya ini sudah pun diterbitkan (idempoten)."
          : `Berjaya diterbitkan pada ${data.publishedAt ?? "—"}.`
      );
      toast("Karya diterbitkan. Pembaca kini boleh membacanya.", "success");
      const workRes = await fetch(`/api/admin/works/${workId}`);
      if (workRes.ok) {
        const work: WorkData = await workRes.json();
        setForm((prev) => ({ ...prev, status: work.status, version: work.version_label || work.version }));
      }
      await loadReadiness();
      setTimeout(() => setPublishSuccess(null), 5000);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      await loadReadiness();
    } finally {
      setPublishing(false);
    }
  }

  async function loadCredits() {
    try {
      const res = await fetch(`/api/admin/credits?workId=${workId}`);
      if (res.ok) {
        setCredits(await res.json());
      }
    } catch {
      // Ignore credit loading errors
    }
  }

  async function loadContributors() {
    try {
      const res = await fetch("/api/admin/contributors");
      if (res.ok) {
        const data = await res.json();
        setContributors(data.map((c: { slug: string; display_name: string; kind?: string }) => ({
          slug: c.slug,
          display_name: c.display_name,
          kind: c.kind,
        })));
      }
    } catch {
      // Ignore contributor loading errors
    }
  }

  async function loadVisuals() {
    void loadReadiness();
    try {
      const res = await fetch(`/api/admin/visuals?workId=${workId}`);
      if (res.ok) {
        setVisuals(await res.json());
      }
    } catch {
      // Ignore visual loading errors
    }
  }

  async function previewMarkerMigration() {
    if (dirty) {
      setMarkerMigrationError("Simpan perubahan manuskrip dahulu sebelum menyemak penanda gambar lama.");
      return;
    }
    setMarkerMigrationBusy(true);
    setMarkerMigrationError("");
    try {
      const res = await fetch(`/api/admin/works/${workId}/image-markers`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Pratonton gagal dimuatkan.");
      setMarkerMigration(data);
    } catch (error) {
      setMarkerMigrationError(error instanceof Error ? error.message : "Pratonton gagal dimuatkan.");
    } finally {
      setMarkerMigrationBusy(false);
    }
  }

  async function runMarkerMigration(action: "apply" | "restore") {
    if (!markerMigration || dirty) return;
    setMarkerMigrationBusy(true);
    setMarkerMigrationError("");
    try {
      const res = await fetch(`/api/admin/works/${workId}/image-markers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, expectedBody: markerMigration.plan.originalBody, expectedChanges: markerMigration.plan.changes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Penukaran gagal.");
      const workRes = await fetch(`/api/admin/works/${workId}`);
      const work = await workRes.json();
      setForm((prev) => ({ ...prev, body: work.body || "" }));
      setSavedBody(work.body || "");
      await loadVisuals();
      setMarkerMigration(null);
      setSuccess(action === "apply" ? `${data.converted} gambar ditukar kepada penanda. Semak pratonton sebelum menerbitkan semula.` : `${data.restored} gambar dipulihkan kepada anchor asal.`);
    } catch (error) {
      setMarkerMigrationError(error instanceof Error ? error.message : "Penukaran gagal.");
    } finally {
      setMarkerMigrationBusy(false);
    }
  }

  async function loadGlossary() {
    try {
      const res = await fetch(`/api/admin/glossary?workId=${workId}`);
      if (res.ok) {
        setGlossaryTerms(await res.json());
      }
    } catch {
      // Ignore glossary loading errors
    }
  }

  async function loadCharacters() {
    try {
      const res = await fetch(`/api/admin/works/${workId}/characters`);
      if (res.ok) {
        setCharacters(await res.json());
      }
    } catch {
      // Ignore character loading errors
    }
  }

  function addCharacterRow() {
    setCharacters((prev) => [...prev, { name: "", role: "", firstAppearanceSection: null }]);
  }

  function updateCharacterRow(index: number, patch: Partial<CharacterEntry>) {
    setCharacters((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeCharacterRow(index: number) {
    setCharacters((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveCharacters() {
    setCharactersError(null);
    setCharactersSuccess(null);
    setCharactersSaving(true);

    try {
      const res = await fetch(`/api/admin/works/${workId}/characters`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characters }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan watak.");
      }

      setCharacters(data);
      setCharactersSuccess("Watak disimpan.");
      setTimeout(() => setCharactersSuccess(null), 3000);
    } catch (err) {
      setCharactersError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setCharactersSaving(false);
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title.trim() || !form.slug.trim()) {
      setError("Tajuk dan alamat pautan perlu diisi sebelum menyimpan.");
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { version: _displayVersion, type: _fixedType, ...editableForm } = form;
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editableForm,
          readingMinutes: form.readingMinutes ? Number(form.readingMinutes) : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan.");
      }

      setSuccess("Teks & maklumat karya disimpan.");
      setSavedBody(form.body);
      setDirty(false);
      setTimeout(() => setSuccess(null), 3000);
      await loadReadiness();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveCredit() {
    if (!editingCredit) return;

    setCreditError(null);

    // The read side (GET /api/admin/credits) returns DB column names
    // (snake_case), which editingCredit is populated from. The write side
    // (POST/PATCH) expects camelCase — translate here rather than sending
    // editingCredit as-is, which the API silently rejects as missing.
    const payload = {
      contributorSlug: editingCredit.contributor_slug || undefined,
      guestName: editingCredit.guest_name || undefined,
      roleLabel: editingCredit.role_label,
      byline: editingCredit.byline,
      isPublic: editingCredit.is_public,
    };

    try {
      if (editingCredit.id) {
        // Update existing credit
        const res = await fetch(`/api/admin/credits/${editingCredit.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan kredit.");
        }
      } else {
        // Create new credit
        const res = await fetch("/api/admin/credits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            workId,
            sortOrder: credits.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta kredit.");
        }
      }

      setEditingCredit(null);
      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteCredit(id: number) {
    if (!(await confirmAction("Pasti ingin memadam kredit ini?", { danger: true, confirmLabel: "Ya, teruskan" }))) return;

    try {
      const res = await fetch(`/api/admin/credits/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam kredit.");
      }

      loadCredits();
    } catch (err) {
      setCreditError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleSaveVisual() {
    if (!editingVisual) return;

    setVisualError(null);
    if (editingVisual.role !== "hero" && !editingVisual.anchor?.trim()) {
      setVisualError("Pilih penanda dalam manuskrip sebelum menyimpan gambar dalam teks.");
      return;
    }
    if (editingVisual.role !== "hero" && isImageMarker(editingVisual.anchor)) {
      const marker = editingVisual.anchor!.trim();
      if (savedBody.split(marker).length !== 2) {
        setVisualError("Penanda mesti muncul tepat sekali dalam manuskrip yang telah disimpan.");
        return;
      }
      if (visuals.some((visual) => visual.id !== editingVisual.id && visual.anchor === marker)) {
        setVisualError("Penanda ini sudah digunakan oleh gambar lain. Pilih penanda yang kosong.");
        return;
      }
    }

    // Same read/write naming split as credits (see handleSaveCredit): the
    // GET response and editingVisual use the DB column name creation_id,
    // but the API expects creationId — translate it here.
    const payload = { ...editingVisual, anchor: editingVisual.role === "hero" ? null : editingVisual.anchor, creationId: editingVisual.creation_id };

    try {
      if (editingVisual.id) {
        // Update existing visual
        const res = await fetch(`/api/admin/visuals/${editingVisual.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan visual.");
        }
      } else {
        // Create new visual
        const res = await fetch("/api/admin/visuals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            workId,
            sortOrder: visuals.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal mencipta visual.");
        }
      }

      setEditingVisual(null);
      await loadVisuals();
      toast("Butiran gambar disimpan.", "success");
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleReplaceVisual(id: number, file: File) {
    const ok = await confirmAction(
      "Ganti gambar ini dengan fail yang dipilih? Gambar lama akan dikeluarkan daripada karya.",
      { confirmLabel: "Ya, ganti" }
    );
    if (!ok) return;
    setVisualError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/admin/visuals/${id}/replace`, { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal mengganti imej.");
      await loadVisuals();
      toast(form.status === "published" ? "Gambar diganti dalam draf. Pembaca belum melihatnya: tekan Terbitkan semula di atas karya." : "Gambar diganti. Semak pratonton sebelum menerbitkan.", "success");
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteVisual(id: number) {
    if (!(await confirmAction("Pasti ingin memadam visual ini?", { danger: true, confirmLabel: "Ya, teruskan" }))) return;

    try {
      const res = await fetch(`/api/admin/visuals/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam visual.");
      }

      loadVisuals();
    } catch (err) {
      setVisualError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleSaveGlossary() {
    if (!editingGlossary) return;

    setGlossaryError(null);

    try {
      if (editingGlossary.id) {
        // Update existing term
        const res = await fetch(`/api/admin/glossary/${editingGlossary.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingGlossary),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menyimpan istilah glosari.");
        }
      } else {
        // Create new term
        const res = await fetch("/api/admin/glossary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...editingGlossary,
            workId,
            sortOrder: glossaryTerms.length + 1,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Gagal menambah istilah glosari.");
        }
      }

      setEditingGlossary(null);
      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function handleDeleteGlossary(id: number) {
    if (!(await confirmAction("Pasti ingin memadam istilah glosari ini?", { danger: true, confirmLabel: "Ya, teruskan" }))) return;

    try {
      const res = await fetch(`/api/admin/glossary/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memadam istilah glosari.");
      }

      loadGlossary();
    } catch (err) {
      setGlossaryError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    }
  }

  async function loadPublishPreview() {
    try {
      const res = await fetch(`/api/admin/publish?action=preview&workId=${workId}`);
      if (res.ok) {
        setPublishPreview(await res.json());
      }
    } catch {
      // Ignore preview loading errors
    }
  }

  async function handlePublish() {
    if (!(await confirmAction("Pasti ingin menerbitkan karya ini ke Markdown?"))) return;

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(null);

    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "publish",
          workId,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || "Gagal menerbitkan.");
      }

      setPublishSuccess(`Berjaya diterbitkan ke ${result.filePath}`);
      setTimeout(() => setPublishSuccess(null), 5000);
      loadPublishPreview();
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setPublishing(false);
    }
  }

  useEffect(() => {
    loadPublishPreview();
  }, [workId]);

  async function handleArchive() {
    if (!(await confirmAction("Pasti ingin mengarkibkan karya ini?", { danger: true, confirmLabel: "Ya, teruskan" }))) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });

      if (!res.ok) throw new Error("Gagal mengarkibkan.");
      router.push("/admin/works");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setSaving(false);
    }
  }

  async function publishNow() {
    if (dirty) {
      setPublishError("Ada perubahan teks atau maklumat yang belum disimpan. Tekan Simpan teks & maklumat dahulu, kemudian terbitkan.");
      return;
    }
    if (!(await confirmAction("Terbitkan karya ini kepada pembaca? Karya akan kelihatan di laman awam."))) return;
    if (form.status !== "ready") {
      setSaving(true);
      try {
        const res = await fetch(`/api/admin/works/${workId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "ready" })
        });
        if (!res.ok) throw new Error("Gagal menyediakan karya untuk diterbitkan.");
        setForm((prev) => (prev ? { ...prev, status: "ready" } : prev));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    await doPublish();
  }

  async function changeStatus(next: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/works/${workId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Gagal menukar status.");
      setForm((prev) => (prev ? { ...prev, status: next } : prev));
      toast("Status dikemas kini.", "success");
      loadReadiness();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="admin-loading">
        <LoadingBlock label="karya" />
      </div>
    );
  }

  return (
    <div className="admin-form-page">
      <WorkStatusPanel
        workId={workId}
        title={form.title}
        type={form.type}
        slug={form.slug}
        status={form.status}
        readiness={readiness}
        loading={readinessLoading}
        error={readinessError}
        busy={publishing || saving}
        onRecheck={loadReadiness}
        onChangeStatus={changeStatus}
        onPublish={handleExplicitPublish}
        onPublishNow={publishNow}
        onRepublish={republishNow}
        dirty={dirty}
        onGoTab={(tab) => selectTab(tab === "visuals" ? "content" : tab as Tab)}
      />

      {error && (
        <div className="admin-alert admin-alert-error">{error}</div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">{success}</div>
      )}

      {publishError && (
        <div className="admin-alert admin-alert-error">{publishError}</div>
      )}

      {publishSuccess && (
        <div className="admin-alert admin-alert-success">{publishSuccess}</div>
      )}

      {publishPreview?.slugCollision && isLocalHost && (
        <div className="admin-alert admin-alert-error">
          Alamat pautan (slug) &quot;{form.slug}&quot; sudah digunakan oleh
          fail Markdown lain yang bukan kepunyaan karya ini. Menerbitkan
          karya ini akan ditolak sehingga konflik slug diselesaikan
          (tukar Alamat pautan, atau sahkan fail sedia ada bukan
          diperlukan lagi).
        </div>
      )}


      {publishPreview && isLocalHost && (
        <div className="admin-publish-preview">
          <h3>Penyegerakan</h3>
          {publishPreview.isNew ? (
            <p className="admin-sync-status admin-sync-new">MARKDOWN MISSING — Karya ini belum ada sebagai Markdown.</p>
          ) : publishPreview.metadataChanged || publishPreview.bodyChanged ? (
            <p className="admin-sync-status admin-sync-changed">DB CHANGED — Perubahan dalam database belum diterbitkan ke Markdown.</p>
          ) : (
            <p className="admin-sync-status admin-sync-ok">IN SYNC — Database dan Markdown adalah selari.</p>
          )}
        </div>
      )}

      <div className="a-work-savebar" aria-label="Simpan teks dan maklumat karya">
        <div>
          <strong>Teks &amp; maklumat karya</strong>
          <span className="a-savebar-note" role="status">{dirty ? "Ada perubahan belum disimpan" : "Tiada perubahan tertunggak"}</span>
          <span className="admin-form-hint" style={{ display: "block", margin: 0 }}>
            Teks dan maklumat hanya disimpan apabila anda menekan butang ini. Kredit, gambar, glosari dan watak disimpan serta-merta apabila anda menyimpannya sendiri di tab masing-masing.
          </span>
        </div>
        <div className="a-work-savebar-actions">
          <a href="/admin/works" className="admin-btn admin-btn-outline">Kembali</a>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void handleSubmit()} disabled={saving || !dirty}>
            {saving ? "Menyimpan…" : "Simpan teks & maklumat"}
          </button>
        </div>
      </div>
      <p className="admin-form-hint a-work-save-help">Gambar, kredit, glosari dan bahagian disimpan melalui tindakan masing-masing — tidak memerlukan butang ini.</p>

      <section className="a-assistant" aria-label="Isi maklumat dengan chatbot">
        <h2>Isi maklumat dengan chatbot (sekali salin, sekali tampal)</h2>
        <p className="admin-form-hint">
          Chatbot hanya membantu; editor yang memutuskan. Satu jawapan mengisi dek, genre, watak, glosari{form.type === "fragmen" || form.type === "sinopsis" ? " dan maklumat sumber" : ""} yang masih kosong. Teks karya, kredit, imej dan hak tidak diisi, dan apa yang sudah anda tulis tidak diganti.
        </p>
        <div className="admin-form-actions">
          <button type="button" className="admin-btn admin-btn-outline" onClick={() => void copyFillPrompt()} disabled={fillBusy}>1. Salin arahan</button>
          <button type="button" className="admin-btn admin-btn-primary" onClick={() => void pasteFillFromClipboard()} disabled={fillBusy}>
            {fillBusy ? "Mengisi…" : "2. Tampal & isi"}
          </button>
        </div>
        {fillNote.length > 0 ? (
          <ul className="admin-form-hint" role="status">
            {fillNote.map((line, i) => (<li key={i}>{line}</li>))}
          </ul>
        ) : null}
      </section>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "content" ? "admin-tab-active" : ""}`}
          aria-pressed={activeTab === "content"}
          onClick={() => selectTab("content")}
        >
          Kandungan
        </button>
        <button
          className={`admin-tab ${activeTab === "metadata" ? "admin-tab-active" : ""}`}
          aria-pressed={activeTab === "metadata"}
          onClick={() => selectTab("metadata")}
        >
          Maklumat
        </button>
        {form.type === "novela" && (
          <button
            className={`admin-tab ${activeTab === "sections" ? "admin-tab-active" : ""}`}
            aria-pressed={activeTab === "sections"}
            onClick={() => selectTab("sections")}
          >
            Bahagian ({sections.length})
          </button>
        )}
        <button
          className={`admin-tab ${activeTab === "credits" ? "admin-tab-active" : ""}`}
          aria-pressed={activeTab === "credits"}
          onClick={() => selectTab("credits")}
        >
          Kredit ({credits.length})
        </button>
        <button
          className={`admin-tab ${activeTab === "glossary" ? "admin-tab-active" : ""}`}
          aria-pressed={activeTab === "glossary"}
          onClick={() => selectTab("glossary")}
        >
          Glosari ({glossaryTerms.length})
        </button>
        <button
          className={`admin-tab ${activeTab === "characters" ? "admin-tab-active" : ""}`}
          aria-pressed={activeTab === "characters"}
          onClick={() => selectTab("characters")}
        >
          Watak ({characters.length})
        </button>
        {isSourced(form.type, form.origin) && (
          <button
            className={`admin-tab ${activeTab === "source" ? "admin-tab-active" : ""}`}
            aria-pressed={activeTab === "source"}
            onClick={() => selectTab("source")}
          >
            Sumber &amp; Hak
          </button>
        )}
      </div>

      {activeTab !== "glossary" && <details className="admin-advanced-field">
        <summary>Bantuan chatbot untuk tab {TAB_NAMES[activeTab as Tab] ?? activeTab}</summary>
        <p className="admin-form-hint">Salin arahan bersama manuskrip semasa, kemudian tampal ke chatbot pilihan anda. Cadangan tidak diimport atau disimpan secara automatik; editor kekal bertanggungjawab menyemaknya.</p>
        <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => void copyAssistantPrompt()}>Salin arahan tab ini</button>
        {assistantNote && <p className="admin-form-hint" role="status">{assistantNote}</p>}
      </details>}

      {activeTab === "content" && (
        <form onSubmit={handleSubmit} onChange={() => setDirty(true)} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="title">Tajuk *</label>
            <input
              id="title"
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm((prev) => {
                const title = e.target.value;
                const generated = title.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                return { ...prev, title, slug: prev.slug.startsWith("draf-") && generated ? generated : prev.slug };
              })}
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="dek">Dek</label>
            <textarea
              id="dek"
              className="admin-textarea"
              rows={5}
              value={form.dek}
              onChange={(e) => setForm((prev) => ({ ...prev, dek: e.target.value }))}
            />
          </div>

          {form.type === "novela" && sections.length > 0 ? (
            <div className="admin-alert admin-alert-info" role="note">
              <strong>Teks Novela ini disunting bab demi bab.</strong>
              <p style={{ margin: "6px 0 10px" }}>
                Novela menyimpan teksnya dalam {sections.length} bahagian, bukan dalam satu kotak manuskrip, jadi tiada teks di sini. Teks sebenar tidak hilang dan pembaca melihatnya seperti biasa.
              </p>
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => selectTab("sections")}>
                Buka Bahagian ({sections.length})
              </button>
            </div>
          ) : (
          <div className="admin-form-group">
            <label htmlFor={manuscriptMode === "visual" ? undefined : "body"}>Manuskrip *</label>
            <div className="admin-manuscript-mode" role="group" aria-label="Mod penyuntingan manuskrip">
              <button type="button" className={manuscriptMode === "visual" ? "is-active" : ""} aria-pressed={manuscriptMode === "visual"} disabled={manuscriptMode === "markdown" && !canEditVisually(form.body)} onClick={() => setManuscriptMode("visual")}>Visual</button>
              <button type="button" className={manuscriptMode === "markdown" ? "is-active" : ""} aria-pressed={manuscriptMode === "markdown"} onClick={() => setManuscriptMode("markdown")}>Markdown</button>
            </div>
            {manuscriptMode === "visual" ? <VisualManuscriptEditor
              value={form.body}
              onChange={(body) => { setForm((prev) => ({ ...prev, body })); setDirty(true); }}
              existingAnchors={visuals.map((visual) => visual.anchor)}
              onMarkerInserted={(marker) => { setSelectedImageAnchor(marker); toast(`Penanda ${marker} disisipkan. Simpan teks & maklumat sebelum memuat naik gambar.`, "success"); }}
            /> : <>
              <textarea
                id="body"
                ref={manuscriptRef}
                value={form.body}
                onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))}
                rows={25}
                className="admin-textarea"
              />
              <span className="admin-form-hint">Gunakan Markdown. Ganti baris kosong untuk perenggan baharu.</span>
            </>}
            {manuscriptMode === "markdown" && !canEditVisually(form.body) && <span className="admin-form-hint">Manuskrip ini menggunakan sintaks yang belum disokong oleh mod Visual. Teruskan dalam Markdown supaya format asal tidak berubah.</span>}
            <details className="admin-advanced-field">
              <summary>Panduan penulisan &amp; Markdown</summary>
              <p>Dalam mod Visual, pilih teks dan gunakan butang pemformatan. Mod Markdown memberi kawalan penuh. Kedua-duanya menyimpan manuskrip yang sama.</p>
              <ul>
                <li>Perenggan baharu: tinggalkan satu baris kosong.</li>
                <li><code>**tebal**</code> → <strong>tebal</strong>; <code>*condong*</code> → <em>condong</em>. Gunakan condong untuk judul karya yang disebut dalam prosa.</li>
                <li><code>## Tajuk bahagian</code> pada baris sendiri → tajuk bahagian; <code>---</code> pada baris sendiri → pemisah adegan.</li>
                <li><code>&gt; Petikan</code> → petikan; <code>[teks pautan](https://contoh.com)</code> → pautan; <code>- Butiran</code> → senarai. Format ini disunting dalam mod Markdown.</li>
                <li><code>[[gambar:1]]</code> pada baris sendiri → lokasi gambar dalam teks. Alihkan baris penanda untuk mengalihkan gambar.</li>
                <li>Kotak mesej: <code>:::mesej</code>, isi mesej, kemudian <code>:::</code> pada baris sendiri. Untuk e-mel, gunakan <code>:::emel</code>. Tiada nombor telefon atau alamat diperlukan.</li>
              </ul>
              <p>Isi tajuk utama dalam medan Tajuk—<code># Tajuk</code> di dalam manuskrip tidak dipaparkan kepada pembaca. Semak hasil melalui Pratonton bacaan sebelum menyimpan.</p>
            </details>
            <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={() => setShowManuscriptPreview((value) => !value)}>{showManuscriptPreview ? "Tutup pratonton bacaan" : "Pratonton bacaan"}</button>
            {showManuscriptPreview && <div className="admin-markdown-preview"><StoryMarkdown glossary={{}}>{stripImageMarkers(form.body)}</StoryMarkdown></div>}
            {manuscriptMode === "markdown" && <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" onClick={chooseImagePosition}>
              Sisip penanda gambar selepas perenggan ini
            </button>}
            <span className="admin-form-hint">Penanda seperti [[gambar:1]] tidak dipaparkan kepada pembaca. Pindahkan baris penanda untuk mengalihkan gambar, kemudian simpan teks &amp; maklumat.</span>
            {dirty ? <span className="admin-form-hint">Simpan manuskrip sebelum memautkan gambar pada penanda baharu.</span> : null}
            {positionError ? <span className="admin-alert admin-alert-error" role="alert">{positionError}</span> : null}
          </div>
          )}
        </form>
      )}

      {activeTab === "metadata" && (
        <form onSubmit={handleSubmit} onChange={() => setDirty(true)} className="admin-form">
          <div className="admin-form-group">
            <label htmlFor="slug">Alamat pautan *</label>
            <input
              id="slug"
              type="text"
              required
              value={form.slug}
              onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
            />
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="type">Jenis *</label>
              <input id="type" value={WORK_TYPES.find((t) => t.value === form.type)?.label ?? form.type} readOnly aria-describedby="type-hint" />
              <span id="type-hint" className="admin-form-hint">Jenis ditetapkan semasa karya dicipta supaya struktur dan pautannya kekal tepat.</span>
            </div>
            {(form.type === "cerpen" || form.type === "novela") && (
              <div className="admin-form-group">
                <label htmlFor="origin">Asal-usul karya</label>
                <select
                  id="origin"
                  value={form.origin}
                  onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
                  disabled={form.status === "published"}
                >
                  <option value="asli">Asli Jalin</option>
                  <option value="sumber">Daripada sumber lain</option>
                </select>
                <span className="admin-form-hint">
                  {form.origin === "sumber"
                    ? "Tab Sumber & Hak dibuka: isi butiran naskhah dan rekod semakan hak. Simpan dahulu supaya tab itu muncul."
                    : "Karya asli Jalin tidak memerlukan butiran sumber atau semakan hak."}
                </span>
              </div>
            )}

            <div className="admin-form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                disabled={form.status === "published"}
              >
                {form.status === "published" ? (
                  <option value="published">Diterbitkan</option>
                ) : (
                  EDITABLE_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))
                )}
              </select>
              {form.status === "published" && (
                <span className="admin-form-hint">
                  Status published ditetapkan melalui butang Terbitkan sahaja.
                </span>
              )}
            </div>

            <div className="admin-form-group">
              <label htmlFor="version">Versi</label>
              <input id="version" type="text" value={form.version} readOnly aria-describedby="version-hint" />
              <span id="version-hint" className="admin-form-hint">Dikemas kini melalui aliran penerbitan dan sejarah editorial.</span>
            </div>
          </div>

          <div className="admin-form-row">
            <div className="admin-form-group">
              <label htmlFor="genre">Genre</label>
              <input
                id="genre"
                type="text"
                value={form.genre}
                onChange={(e) => setForm((prev) => ({ ...prev, genre: e.target.value }))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="audience">Audiens</label>
              <input
                id="audience"
                type="text"
                value={form.audience}
                onChange={(e) => setForm((prev) => ({ ...prev, audience: e.target.value }))}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="readingMinutes">Minit Bacaan</label>
              <input
                id="readingMinutes"
                type="number"
                value={form.readingMinutes}
                onChange={(e) => setForm((prev) => ({ ...prev, readingMinutes: e.target.value }))}
              />
            </div>
          </div>

          <div className="admin-form-group">
            <label htmlFor="editorNote">Catatan editor</label>
            <textarea
              id="editorNote"
              className="admin-textarea"
              rows={8}
              maxLength={5000}
              value={form.editorNote}
              onChange={(e) => setForm((prev) => ({ ...prev, editorNote: e.target.value }))}
              placeholder="Cerita asal usul karya ini, apa yang menarik tentangnya, atau apa-apa yang editor mahu kongsi dengan pembaca."
            />
            <span className="admin-form-hint">
              Dipaparkan kepada pembaca di hujung karya, bawah tajuk &quot;Catatan Editor&quot;. Bebas ditulis; baris kosong memulakan perenggan baharu. Biarkan kosong jika tiada catatan. Karya terbit hanya menunjukkan catatan baharu selepas diterbitkan semula.
            </span>
          </div>
          <p className="admin-form-hint">
            Memilih karya untuk laman utama dibuat di halaman <a href="/admin/pilihan-editor">Pilihan Editor</a>, bukan di sini.
          </p>

        </form>
      )}

      {activeTab === "sections" && form.type === "novela" && (
        <div className="admin-sections">
          {sectionError && <div className="admin-alert admin-alert-error">{sectionError}</div>}
          {sectionSuccess && <div className="admin-alert admin-alert-success">{sectionSuccess}</div>}

          <div className="admin-credits-header">
            <h3>Bahagian Novela</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingSection({ slug: "", title: "", body: "" })}
            >
              + Tambah Bahagian
            </button>
          </div>
          <p className="admin-form-hint">
            Novela kekal satu Work. Bahagian ialah struktur dalaman — bukan karya berasingan.
            Apabila bahagian wujud, ia menjadi struktur kanonik pembaca.
          </p>

          {editingSection && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Alamat pautan *</label>
                  <input
                    type="text"
                    value={editingSection.slug || ""}
                    onChange={(e) => setEditingSection((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="bab-satu"
                  />
                </div>
                <div className="admin-form-group">
                  <label>Tajuk bahagian</label>
                  <input
                    type="text"
                    value={editingSection.title || ""}
                    onChange={(e) => setEditingSection((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Bab Satu"
                  />
                </div>
              </div>
              <div className="admin-form-group">
                <label>Isi (Markdown) *</label>
                <textarea
                  value={editingSection.body || ""}
                  onChange={(e) => setEditingSection((prev) => ({ ...prev, body: e.target.value }))}
                  rows={12}
                  className="admin-textarea"
                />
              </div>
              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingSection(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveSection}
                >
                  Simpan Bahagian
                </button>
              </div>
            </div>
          )}

          {sections.length === 0 ? (
            <p className="admin-table-empty">
              Tiada bahagian — Novela menggunakan works.body sahaja sehingga bahagian ditambah.
            </p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Alamat pautan</th>
                    <th>Tajuk</th>
                    <th>Isi</th>
                    <th>Kedudukan dalam teks</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.map((section, index) => (
                    <tr key={section.id}>
                      <td>Bahagian {section.position}</td>
                      <td><code>{section.slug}</code></td>
                      <td>{section.title || "—"}</td>
                      <td>{section.body.length} aksara</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => handleMoveSection(index, -1)}
                            disabled={index === 0}
                            aria-label={`Naikkan Bahagian ${section.position}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => handleMoveSection(index, 1)}
                            disabled={index === sections.length - 1}
                            aria-label={`Turunkan Bahagian ${section.position}`}
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingSection(section)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "credits" && (
        <div className="admin-credits">
          {creditError && (
            <div className="admin-alert admin-alert-error">{creditError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Kredit Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => {
                setCreditKind("manusia");
                setEditingCredit({
                  contributor_slug: "",
                  guest_name: "",
                  role_label: "",
                  byline: false,
                });
              }}
            >
              + Tambah Kredit
            </button>
          </div>

          {editingCredit && (
            <div className="admin-credit-form">
              <div className="admin-form-group">
                <label>Kredit ini untuk</label>
                <div className="admin-checkbox-group">
                  <label className="admin-checkbox-label">
                    <input
                      type="radio"
                      name="credit-kind"
                      checked={creditKind === "manusia"}
                      onChange={() => {
                        setCreditKind("manusia");
                        setEditingCredit((prev) => (isAiSlug(prev?.contributor_slug) ? { ...prev, contributor_slug: undefined } : prev));
                      }}
                    />
                    Manusia
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="radio"
                      name="credit-kind"
                      checked={creditKind === "ai"}
                      onChange={() => {
                        setCreditKind("ai");
                        setEditingCredit((prev) => ({ ...prev, contributor_slug: isAiSlug(prev?.contributor_slug) ? prev?.contributor_slug : undefined, guest_name: undefined }));
                      }}
                    />
                    AI (dipaparkan dengan nama samaran)
                  </label>
                </div>
              </div>
              {creditKind === "ai" ? (
                <AiCreditPicker
                  currentSlug={editingCredit.contributor_slug || undefined}
                  onPick={(slug) => setEditingCredit((prev) => ({ ...prev, contributor_slug: slug, guest_name: undefined }))}
                />
              ) : null}
              <div className="admin-form-row" style={creditKind === "ai" ? { display: "none" } : undefined}>
                <div className="admin-form-group">
                  <label>Penyumbang (manusia)</label>
                  <select
                    value={editingCredit.contributor_slug || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      contributor_slug: e.target.value || undefined,
                      guest_name: e.target.value ? undefined : prev?.guest_name,
                    }))}
                  >
                    <option value="">-- Pilih --</option>
                    {contributors.filter((c) => c.kind !== "virtual").map((c) => (
                      <option key={c.slug} value={c.slug}>{c.display_name}</option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label>Atau Nama Tetamu</label>
                  <input
                    type="text"
                    value={editingCredit.guest_name || ""}
                    onChange={(e) => setEditingCredit((prev) => ({
                      ...prev,
                      guest_name: e.target.value || undefined,
                      contributor_slug: e.target.value ? undefined : prev?.contributor_slug,
                    }))}
                    placeholder="Nama tetamu"
                  />
                </div>
              </div>

              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Peranan *</label>
                  <CreditRoleSelect
                    value={editingCredit.role_label || ""}
                    onChange={(role) => setEditingCredit((prev) => ({
                      ...prev,
                      role_label: role,
                    }))}
                  />
                </div>

                <div className="admin-form-group">
                  <label>&nbsp;</label>
                  <div className="admin-checkbox-group">
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingCredit.byline || false}
                        onChange={(e) => setEditingCredit((prev) => ({
                          ...prev,
                          byline: e.target.checked,
                        }))}
                      />
                      Nama di bawah tajuk
                    </label>
                    <label className="admin-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editingCredit.is_public !== false}
                        onChange={(e) => setEditingCredit((prev) => ({
                          ...prev,
                          is_public: e.target.checked,
                        }))}
                      />
                      Awam
                    </label>
                  </div>
                </div>
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingCredit(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveCredit}
                >
                  Simpan Kredit
                </button>
              </div>
            </div>
          )}

          {credits.length === 0 ? (
            <p className="admin-table-empty">Tiada kredit untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Penyumbang</th>
                    <th>Jenis</th>
                    <th>Peranan</th>
                    <th>Nama di bawah tajuk</th>
                    <th>Awam</th>
                    <th>Susunan</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {credits.map((credit) => (
                    <tr key={credit.id}>
                      <td>
                        {credit.contributor_slug
                          ? contributors.find((c) => c.slug === credit.contributor_slug)?.display_name || credit.contributor_slug
                          : credit.guest_name || "—"}
                      </td>
                      <td>{isAiSlug(credit.contributor_slug) ? "AI" : "Manusia"}</td>
                      <td>{roleDisplay(credit.role_label)}</td>
                      <td>{credit.byline ? "Ya" : "Tidak"}</td>
                      <td>{credit.is_public ? "Ya" : "Tidak"}</td>
                      <td>{credit.sort_order}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => {
                              setCreditKind(isAiSlug(credit.contributor_slug) ? "ai" : "manusia");
                              setEditingCredit(credit);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteCredit(credit.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "content" && (
        <div className="admin-visuals">
          {visualError && (
            <div className="admin-alert admin-alert-error">{visualError}</div>
          )}

          {visuals.length > 0 && !visuals.some((v) => v.role === "hero") ? (
            <div className="admin-alert admin-alert-warning">
              Karya ini belum ada gambar berperanan <strong>Utama</strong>. Halaman utama dan kad hanya memaparkan gambar
              Hero; tanpanya karya dipaparkan dengan huruf sahaja. Tukar peranan satu gambar kepada Hero.
            </div>
          ) : null}

          <div className="admin-credits-header">
            <h3>Gambar dalam karya</h3>
          </div>

          {editingVisual && (
            <div className="admin-credit-form">
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label>Jenis *</label>
                  <select
                    value={editingVisual.role || "inline"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      role: e.target.value,
                    }))}
                  >
                    <option value="hero" disabled={visuals.some((v) => v.role === "hero" && v.id !== editingVisual.id)}>Gambar utama</option>
                    <option value="inline">Dalam teks</option>
                    <option value="section">Bahagian</option>
                  </select>
                </div>

                {!isImageMarker(editingVisual.anchor) && <div className="admin-form-group">
                  <label>Kedudukan</label>
                  <select
                    value={editingVisual.place || "after"}
                    onChange={(e) => setEditingVisual((prev) => ({
                      ...prev,
                      place: e.target.value,
                    }))}
                  >
                    <option value="before">Sebelum</option>
                    <option value="after">Selepas</option>
                  </select>
                </div>}
              </div>

              <div className="admin-form-group">
                <label htmlFor="visual-edit-alt">Teks alternatif *</label>
                <input
                  id="visual-edit-alt"
                  type="text"
                  required
                  value={editingVisual.alt || ""}
                  onChange={(e) => setEditingVisual((prev) => ({
                    ...prev,
                    alt: e.target.value,
                  }))}
                  placeholder="Satu ayat yang menerangkan gambar kepada pembaca yang tidak dapat melihatnya"
                />
              </div>

              {editingVisual.role !== "hero" && <div className="admin-form-group">
                <label htmlFor="edit-image-marker">Penanda dalam manuskrip</label>
                <select id="edit-image-marker" value={editingVisual.anchor || ""} onChange={(e) => setEditingVisual((prev) => ({ ...prev, anchor: e.target.value }))}>
                  <option value="">Pilih penanda…</option>
                  {editingVisual.anchor && !isImageMarker(editingVisual.anchor) && <option value={editingVisual.anchor}>Anchor lama — kekalkan sementara</option>}
                  {imageMarkers(savedBody).map((marker) => (
                    <option key={marker} value={marker} disabled={visuals.some((visual) => visual.id !== editingVisual.id && visual.anchor === marker)}>{marker}</option>
                  ))}
                </select>
                <span className="admin-form-hint">Untuk memindahkan gambar: sisip penanda di manuskrip, simpan teks &amp; maklumat, kemudian pilih penanda itu di sini. Gambar sedia ada tidak diganti.</span>
              </div>}

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingVisual(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveVisual}
                >
                  Simpan butiran
                </button>
              </div>
            </div>
          )}

          {visuals.length === 0 ? (
            <p className="admin-table-empty">Belum ada gambar. Tambah gambar utama, atau sisip penanda dalam manuskrip untuk gambar dalam teks.</p>
          ) : (
            <div className="work-image-list">
              {visuals.filter((visual) => visual.role === "hero").map((visual) => (
                <WorkImageCard key={visual.id} visual={visual} body={savedBody} onEdit={setEditingVisual} onReplace={handleReplaceVisual} onDelete={handleDeleteVisual} />
              ))}
              {visuals.filter((visual) => visual.role !== "hero").length > 0 && <h4>Gambar dalam teks</h4>}
              {visuals.filter((visual) => visual.role !== "hero").map((visual) => (
                <WorkImageCard key={visual.id} visual={visual} body={savedBody} onEdit={setEditingVisual} onReplace={handleReplaceVisual} onDelete={handleDeleteVisual} />
              ))}
            </div>
          )}
          {visuals.some((visual) => visual.role === "inline") && (
            <div className="admin-form-group">
              <h4>Urus penanda gambar</h4>
              <p className="admin-form-hint">Jika ada penanda lama, semak kedudukannya sebelum menukar kepada [[gambar:N]]. Petikan yang tidak jelas akan dilangkau. Penukaran boleh dipulihkan selagi manuskrip belum disunting lagi.</p>
              <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" disabled={markerMigrationBusy || dirty} onClick={() => void previewMarkerMigration()}>Semak / pulihkan penanda</button>
            </div>
          )}
          {markerMigrationError && <p className="admin-alert admin-alert-error" role="alert">{markerMigrationError}</p>}
          {markerMigration && (
            <div className="admin-form-group" aria-label="Pratonton penukaran penanda gambar">
              <strong>{markerMigration.plan.changes.length} boleh ditukar · {markerMigration.plan.skipped.length} perlu semakan manual</strong>
              <ul>{markerMigration.plan.changes.map((change) => <li key={change.id}>Gambar #{change.id}: {change.from.slice(0, 75)} → {change.to}</li>)}</ul>
              {markerMigration.plan.skipped.length > 0 && <ul>{markerMigration.plan.skipped.map((item) => <li key={item.id}>Gambar #{item.id}: {item.reason}</li>)}</ul>}
              {markerMigration.plan.changes.length > 0 && <button type="button" className="admin-btn admin-btn-primary admin-btn-sm" disabled={markerMigrationBusy || dirty} onClick={() => void runMarkerMigration("apply")}>Sahkan penukaran</button>}
              {markerMigration.canRestore && <button type="button" className="admin-btn admin-btn-outline admin-btn-sm" disabled={markerMigrationBusy || dirty} onClick={() => void runMarkerMigration("restore")}>Pulihkan anchor asal</button>}
            </div>
          )}
          <div id="work-image-upload">
            <WorkVisualUpload workId={workId} hasHero={visuals.some((v) => v.role === "hero")} published={form.status === "published"} suggestedAnchor={selectedImageAnchor} markers={imageMarkers(savedBody).filter((marker) => !visuals.some((visual) => visual.anchor === marker))} onDone={loadVisuals} />
          </div>
        </div>
      )}

      {activeTab === "glossary" && (
        <div className="admin-glossary">
          <section className="a-assistant" aria-label="Glosari dengan chatbot">
            <h3>Glosari dengan chatbot</h3>
            <ol className="admin-form-hint">
              <li>Tekan <strong>Salin arahan</strong>. Arahan, format jawapan dan manuskrip disalin sekali gus.</li>
              <li>Tampal ke chatbot pilihan anda dan tunggu jawapannya.</li>
              <li>Salin jawapan chatbot, kemudian tekan <strong>Tampal &amp; import</strong>. Semua istilah dibaca dan ditambah terus.</li>
            </ol>
            <div className="admin-form-actions">
              <button type="button" className="admin-btn admin-btn-outline" onClick={() => void copyGlossaryPrompt()} disabled={glossaryBusy}>
                1. Salin arahan
              </button>
              <button type="button" className="admin-btn admin-btn-primary" onClick={() => void pasteGlossaryFromClipboard()} disabled={glossaryBusy}>
                {glossaryBusy ? "Mengimport…" : "2. Tampal & import"}
              </button>
            </div>
            {glossaryNote && <p className="admin-form-hint" role="status">{glossaryNote}</p>}
          </section>

          {glossaryError && (
            <div className="admin-alert admin-alert-error">{glossaryError}</div>
          )}

          <div className="admin-credits-header">
            <h3>Glosari Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={() => setEditingGlossary({
                term: "",
                meaning: "",
                source: "",
              })}
            >
              + Tambah istilah
            </button>
          </div>

          {editingGlossary && (
            <div className="admin-credit-form">
              <div className="admin-form-group">
                <label>Istilah *</label>
                <input
                  type="text"
                  value={editingGlossary.term || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    term: e.target.value,
                  }))}
                  placeholder="Istilah"
                  onKeyDown={(e) => italicShortcut(e, "term")}
                  aria-describedby="glossary-italic-hint"
                />
              </div>

              <div className="admin-form-group">
                <label>Maksud *</label>
                <textarea
                  value={editingGlossary.meaning || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    meaning: e.target.value,
                  }))}
                  rows={5}
                  className="admin-textarea"
                  placeholder="Maksud istilah"
                  onKeyDown={(e) => italicShortcut(e, "meaning")}
                  aria-describedby="glossary-italic-hint"
                />
                <span id="glossary-italic-hint" className="admin-form-hint">
                  Untuk mencondongkan perkataan (cth. perkataan asing): pilih teks dan tekan Ctrl+I, atau tulis *teks*. Tiada yang dicondongkan secara automatik.
                </span>
              </div>

              <div className="admin-form-group">
                <label>Sumber</label>
                <input
                  type="text"
                  value={editingGlossary.source || ""}
                  onChange={(e) => setEditingGlossary((prev) => ({
                    ...prev,
                    source: e.target.value,
                  }))}
                  placeholder="Sumber rujukan"
                />
              </div>

              <div className="admin-form-actions">
                <button
                  type="button"
                  className="admin-btn admin-btn-outline"
                  onClick={() => setEditingGlossary(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-primary"
                  onClick={handleSaveGlossary}
                >
                  Simpan istilah
                </button>
              </div>
            </div>
          )}

          {selectedTerms.length > 0 ? (
            <div className="admin-form-actions" role="region" aria-label="Tindakan istilah dipilih">
              <span className="admin-form-hint">{selectedTerms.length} istilah dipilih</span>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-danger" disabled={glossaryBusy} onClick={() => void deleteSelectedGlossary()}>
                Padam yang dipilih ({selectedTerms.length})
              </button>
              <button type="button" className="admin-btn admin-btn-sm admin-btn-outline" onClick={() => setSelectedTerms([])}>Batal pilihan</button>
            </div>
          ) : null}

          {glossaryTerms.length === 0 ? (
            <p className="admin-table-empty">Tiada glosari untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table a-glossary-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <input
                        type="checkbox"
                        aria-label="Pilih semua istilah"
                        checked={glossaryTerms.length > 0 && selectedTerms.length === glossaryTerms.length}
                        onChange={(e) => setSelectedTerms(e.target.checked ? glossaryTerms.map((term) => term.id) : [])}
                      />
                    </th>
                    <th>Istilah</th>
                    <th>Maksud</th>
                    <th>Sumber</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {glossaryTerms.map((term) => (
                    <tr key={term.id}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Pilih istilah ${term.term.replace(/\*/g, "")}`}
                          checked={selectedTerms.includes(term.id)}
                          onChange={(e) => setSelectedTerms((prev) => e.target.checked ? [...prev, term.id] : prev.filter((id) => id !== term.id))}
                        />
                      </td>
                      <td className="admin-table-title">{renderItalics(term.term)}</td>
                      <td>{renderItalics(term.meaning)}</td>
                      <td>{term.source || "—"}</td>
                      <td>
                        <div className="admin-table-actions">
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm"
                            onClick={() => setEditingGlossary(term)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-sm admin-btn-danger"
                            onClick={() => handleDeleteGlossary(term.id)}
                          >
                            Padam
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      {activeTab === "characters" && (
        <div className="admin-characters">
          {charactersError && (
            <div className="admin-alert admin-alert-error">{charactersError}</div>
          )}
          {charactersSuccess && (
            <div className="admin-alert admin-alert-success">{charactersSuccess}</div>
          )}

          <div className="admin-credits-header">
            <h3>Watak Karya</h3>
            <button
              type="button"
              className="admin-btn admin-btn-sm admin-btn-primary"
              onClick={addCharacterRow}
            >
              + Tambah Watak
            </button>
          </div>

          <p className="admin-form-hint admin-characters-note">
            Nama dan peranan sahaja — dipaparkan kepada pembaca (Tentang Karya).
            {form.type === "novela"
              ? " Bahagian Kemunculan Pertama untuk novela sahaja: bab/seksyen di mana watak ini PERTAMA disebut. Belum ditapis oleh pembaca lagi — direkodkan untuk kerja akan datang (lihat docs/NOVELA_PROGRESSIVE_DISCLOSURE.md)."
              : ""}
          </p>

          {characters.length === 0 ? (
            <p className="admin-table-empty">Tiada watak direkodkan untuk karya ini.</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Peranan</th>
                    {form.type === "novela" && <th>Kemunculan Pertama</th>}
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((character, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="text"
                          value={character.name}
                          onChange={(e) => updateCharacterRow(index, { name: e.target.value })}
                          placeholder="Nama watak"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={character.role}
                          onChange={(e) => updateCharacterRow(index, { role: e.target.value })}
                          placeholder="Contoh: Watak utama"
                        />
                      </td>
                      {form.type === "novela" && (
                        <td>
                          <input
                            type="text"
                            value={character.firstAppearanceSection ?? ""}
                            onChange={(e) => updateCharacterRow(index, {
                              firstAppearanceSection: e.target.value || null,
                            })}
                            placeholder="cth. bab-1"
                          />
                        </td>
                      )}
                      <td>
                        <button
                          type="button"
                          className="admin-btn admin-btn-sm admin-btn-danger"
                          onClick={() => removeCharacterRow(index)}
                        >
                          Padam
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-form-actions">
            <button
              type="button"
              className="admin-btn admin-btn-primary"
              disabled={charactersSaving}
              onClick={handleSaveCharacters}
            >
              {charactersSaving ? "Menyimpan..." : "Simpan Watak"}
            </button>
          </div>
        </div>
      )}
      {activeTab === "source" && isSourced(form.type, form.origin) && (
        <div className="admin-source-rights">
          <div className="admin-credits-header">
            <h3>Sumber karya &amp; semakan hak</h3>
            {sourceRights?.sourceWork?.reviewedAt && (
              <span className="admin-status admin-status-ready">
                Direviu {sourceRights.sourceWork.reviewedBy} · {new Date(sourceRights.sourceWork.reviewedAt).toLocaleString("ms-MY")}
              </span>
            )}
          </div>

          {sourceError && <div className="admin-alert admin-alert-error">{sourceError}</div>}
          {sourceSuccess && <div className="admin-alert admin-alert-success">{sourceSuccess}</div>}
          {sourceLoading && <LoadingBlock label="asal-usul" />}

          {sourceRights && !sourceLoading && (
            <>
              {!sourceRights.isDerivative && (
                <p className="admin-form-hint">
                  Gate rights hanya aktif untuk terjemahan/fragmen/sinopsis.
                </p>
              )}
              {sourceRights.rightsBlockers.length > 0 && (
                <ul className="admin-alert admin-alert-error" style={{ marginBottom: "0.75rem" }}>
                  {sourceRights.rightsBlockers.map((b) => (
                    <li key={b.code + b.message}>[HAK] {b.message}</li>
                  ))}
                </ul>
              )}

              <div className="admin-form">
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-title">Tajuk asal *</label>
                    <input
                      id="src-title"
                      type="text"
                      value={sourceForm.originalTitle}
                      onChange={(e) => setSourceForm((p) => ({ ...p, originalTitle: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-author">Pengarang asal *</label>
                    <input
                      id="src-author"
                      type="text"
                      value={sourceForm.author}
                      onChange={(e) => setSourceForm((p) => ({ ...p, author: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-lang">Bahasa asal *</label>
                    <input
                      id="src-lang"
                      type="text"
                      value={sourceForm.originalLanguage}
                      onChange={(e) => setSourceForm((p) => ({ ...p, originalLanguage: e.target.value }))}
                      placeholder="Contoh: Melayu Klasik"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-year">Tahun terbit pertama *</label>
                    <input
                      id="src-year"
                      type="number"
                      value={sourceForm.publicationYear}
                      onChange={(e) => setSourceForm((p) => ({ ...p, publicationYear: e.target.value }))}
                    />
                  </div>
                </div>
                {form.type === "fragmen" && (
                  <div className="admin-form-group">
                    <label htmlFor="fragmen-text-language">Bahasa petikan yang diterbitkan *</label>
                    <input
                      id="fragmen-text-language"
                      type="text"
                      value={sourceForm.fragmenTextLanguage}
                      onChange={(e) => setSourceForm((p) => ({ ...p, fragmenTextLanguage: e.target.value }))}
                      placeholder="Bahasa Melayu atau Bahasa Indonesia"
                    />
                    <span className="admin-form-hint">
                      {sourceForm.fragmenTextLanguage.trim() && !isMalayLanguage(sourceForm.fragmenTextLanguage) && !(isIndonesianLanguage(sourceForm.fragmenTextLanguage) && classifyFragmen(sourceForm.originalLanguage, sourceForm.fragmenTextLanguage) === "asal")
                        ? "Fragmen asal Indonesia boleh diterbitkan. Untuk bahasa lain, sediakan terjemahan Melayu serta kredit penterjemah dan asas teks."
                        : classifyFragmen(sourceForm.originalLanguage, sourceForm.fragmenTextLanguage) === "asal"
                        ? "Fragmen asal: petikan Melayu atau Indonesia dikekalkan dalam bahasa sumber. Hak sumber tetap perlu disemak."
                        : classifyFragmen(sourceForm.originalLanguage, sourceForm.fragmenTextLanguage) === "terjemahan"
                          ? "Fragmen terjemahan: jelaskan asas terjemahan di bawah dan tambah kredit Penterjemah sebenar. Hak sumber tetap perlu disemak."
                          : "Isi bahasa asal dan bahasa petikan. Jenis Fragmen ditentukan daripada perbandingan kedua-duanya."}
                    </span>
                    {(isMalayLanguage(sourceForm.fragmenTextLanguage) || sourceForm.fragmenTextLanguage.trim() !== "") ? (
                      <label className="admin-checkbox-label" style={{ marginTop: 8 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(sourceRights?.fragmenTextReview?.current)}
                          disabled={dirty}
                          onChange={(e) => void confirmMalayText(e.target.checked)}
                        />
                        <span>
                          Saya sudah membaca teks Fragmen ini dan mengesahkan teksnya benar-benar ditulis dalam bahasa yang dinyatakan di atas.
                        </span>
                      </label>
                    ) : null}
                    {sourceRights?.fragmenTextReview ? (
                      <span className="admin-form-hint">
                        {sourceRights.fragmenTextReview.current
                          ? `Disahkan oleh ${sourceRights.fragmenTextReview.reviewedBy} pada ${new Date(sourceRights.fragmenTextReview.reviewedAt).toLocaleDateString("ms-MY")}.`
                          : "Teks berubah selepas disahkan. Baca dan sahkan semula."}
                      </span>
                    ) : null}
                    {dirty ? <span className="admin-form-hint">Simpan teks dahulu sebelum mengesahkan bahasanya.</span> : null}
                  </div>
                )}
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-edition">Edisi (nama edisi, jika ada)</label>
                    <input
                      id="src-edition"
                      type="text"
                      value={sourceForm.sourceEdition}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceEdition: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-url">URL sumber (http/https); wajib jika tiada penerbit</label>
                    <input
                      id="src-url"
                      type="url"
                      value={sourceForm.sourceUrl}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <fieldset className="admin-form-group" style={{ border: "1px solid #d8dee0", borderRadius: 6, padding: "0.75rem 1rem" }}>
                  <legend>Naskhah yang digunakan</legend>
                  <span className="admin-form-hint">
                    Ini dipaparkan kepada pembaca dalam jadual &quot;Tentang karya&quot;. Tahun terbit pertama ialah tahun karya itu mula diterbitkan; tahun cetakan ialah tahun naskhah di tangan anda dicetak. Jangan campurkan keduanya. Penerbit atau URL sumber mesti ada.
                  </span>
                  {(sourceRights?.chatbotFilledFields ?? []).length > 0 && (
                    <span className="admin-alert admin-alert-info" style={{ display: "block", margin: "0.5rem 0" }}>
                      Chatbot mengisi: {(sourceRights?.chatbotFilledFields ?? []).join(", ")}. Semak setiap satu dengan naskhah sebenar; tanda ini hilang selepas anda merekod semakan hak.
                    </span>
                  )}
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label htmlFor="src-publisher">Penerbit {tagFor("publisher")}</label>
                      <input id="src-publisher" type="text" value={sourceForm.publisher} onChange={(e) => setSourceForm((p) => ({ ...p, publisher: e.target.value }))} />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="src-edition-year">Tahun cetakan {tagFor("editionYear")}</label>
                      <input id="src-edition-year" type="number" value={sourceForm.editionYear} onChange={(e) => setSourceForm((p) => ({ ...p, editionYear: e.target.value }))} />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="src-printing">Cetakan ke {tagFor("printing")}</label>
                      <input id="src-printing" type="text" value={sourceForm.printing} onChange={(e) => setSourceForm((p) => ({ ...p, printing: e.target.value }))} placeholder="Contoh: Cetakan ketiga" />
                    </div>
                  </div>
                  <div className="admin-form-row">
                    <div className="admin-form-group">
                      <label htmlFor="src-editor">Penyunting {tagFor("editorName")}</label>
                      <input id="src-editor" type="text" value={sourceForm.editorName} onChange={(e) => setSourceForm((p) => ({ ...p, editorName: e.target.value }))} />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="src-translator">Penterjemah {tagFor("translatorName")}</label>
                      <input id="src-translator" type="text" value={sourceForm.translatorName} onChange={(e) => setSourceForm((p) => ({ ...p, translatorName: e.target.value }))} />
                    </div>
                    <div className="admin-form-group">
                      <label htmlFor="src-isbn">ISBN {tagFor("isbn")}</label>
                      <input id="src-isbn" type="text" value={sourceForm.isbn} onChange={(e) => setSourceForm((p) => ({ ...p, isbn: e.target.value }))} />
                    </div>
                  </div>
                </fieldset>
                <div className="admin-form-row">
                  <div className="admin-form-group">
                    <label htmlFor="src-locator">Lokasi petikan (muka surat/bab)</label>
                    <input
                      id="src-locator"
                      type="text"
                      value={sourceForm.sourceLocator}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceLocator: e.target.value }))}
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="src-basis">Asas teks {form.type === "fragmen" && classifyFragmen(sourceForm.originalLanguage, sourceForm.fragmenTextLanguage) === "terjemahan" ? "dan terjemahan *" : ""}</label>
                    <textarea
                      id="src-basis"
                      className="admin-textarea"
                      rows={4}
                      value={sourceForm.sourceTextBasis}
                      onChange={(e) => setSourceForm((p) => ({ ...p, sourceTextBasis: e.target.value }))}
                      placeholder="Contoh: teks asal Melayu 1957 (domain awam)"
                    />
                    <span className="admin-form-hint">
                      Bezakan: domain awam asal + terjemahan moden berhak cipta vs terjemahan Jalin daripada sumber asal yang sah.
                    </span>
                  </div>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="src-notes">Asas keputusan hak {(["public_domain", "licensed", "permission_obtained"].includes(sourceForm.rightsStatus)) ? "*" : ""}</label>
                  <textarea
                    id="src-notes"
                    className="admin-textarea"
                    rows={5}
                    value={sourceForm.rightsNotes}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsNotes: e.target.value }))}
                  />
                  <span className="admin-form-hint">Wajib untuk kelulusan. Nyatakan alasan dan sumber semakan; memilih status sahaja tidak mengesahkan hak.</span>
                </div>
                <div className="admin-form-group">
                  <label htmlFor="src-evidence">Bukti/rujukan hak (teks)</label>
                  <textarea
                    id="src-evidence"
                    className="admin-textarea"
                    rows={5}
                    value={sourceForm.rightsEvidence}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsEvidence: e.target.value }))}
                    placeholder="Petikan katalog, DOI, nota arkib, dsb."
                  />
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-outline"
                    onClick={handleSaveProvenance}
                    disabled={sourceSaving}
                  >
                    {sourceSaving ? "Menyimpan..." : "Simpan draf sumber"}
                  </button>
                  <span className="admin-form-hint">Menyimpan butiran sumber sahaja, tanpa meluluskan status hak.</span>
                </div>

                <hr style={{ margin: "1.25rem 0", opacity: 0.3 }} />

                <div className="admin-form-group">
                  <label htmlFor="src-status">Status hak (semakan manusia) *</label>
                  <select
                    id="src-status"
                    value={sourceForm.rightsStatus}
                    onChange={(e) => setSourceForm((p) => ({ ...p, rightsStatus: e.target.value }))}
                  >
                    {RIGHTS_STATUS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <span className="admin-form-hint">
                    Status tersimpan: {RIGHTS_STATUS_OPTIONS.find((option) => option.value === sourceRights.sourceWork?.rightsStatus)?.label ?? "Belum direkod"}. Memilih pilihan baharu belum menyimpannya; semak bukti, kemudian tekan butang di bawah.
                  </span>
                </div>

                <div className="admin-form-actions">
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    onClick={handleRightsReview}
                    disabled={sourceSaving}
                  >
                    {sourceSaving ? "Merekod..." : "Sahkan keputusan hak"}
                  </button>
                </div>
              </div>

              {sourceRights.rightsHistory.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <h4>Sejarah hak</h4>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Masa</th>
                          <th>Pelaku</th>
                          <th>Tindakan</th>
                          <th>Status</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceRights.rightsHistory.map((h, i) => (
                          <tr key={`${h.at}-${i}`}>
                            <td>{new Date(h.at).toLocaleString("ms-MY")}</td>
                            <td>{h.actor}</td>
                            <td>{HISTORY_ACTIONS[h.action] ?? h.action}</td>
                            <td>{RIGHTS_STATUS_OPTIONS.find((o) => o.value === h.rights_status)?.label ?? h.rights_status}</td>
                            <td>{h.note || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      {form.status !== "archived" ? (
        <div className="a-danger-zone">
          <div>
            <strong>Arkibkan karya ini</strong>
            <p className="admin-form-hint">Karya diarkibkan dan tidak lagi dipaparkan. Ia boleh dipulihkan kemudian.</p>
          </div>
          <button type="button" className="a-btn a-btn-danger-outline" onClick={handleArchive} disabled={saving}>
            Arkibkan
          </button>
        </div>
      ) : null}
    </div>
  );
}
