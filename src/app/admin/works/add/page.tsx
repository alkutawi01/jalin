import { KIND_DESCRIPTIONS, KIND_LABELS, WORK_KINDS } from "../../../../lib/admin/authoring/recipes";

export const dynamic = "force-dynamic";

export default function AddWorkPage() {
  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Tambah Karya</h1>
        <p className="admin-page-sub">Pilih jenis karya. Jalin akan sediakan arahan AI yang sesuai untuk jenis itu.</p>
      </header>
      <div className="admin-choice-grid">
        {WORK_KINDS.map((kind) => (
          <a key={kind} href={`/admin/works/add/${kind}`} className="admin-choice">
            <strong>{KIND_LABELS[kind]}</strong>
            <span>{KIND_DESCRIPTIONS[kind]}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
