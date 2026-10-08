import ReaderTypographySettings from "../../../../components/admin/ReaderTypographySettings";

export const dynamic = "force-dynamic";

/** The chief editor has no access to the rest of Tetapan, so this one panel has its own address (the owner also sees it as a tab of Tetapan). */
export default function ReaderTypographyPage() {
  return (
    <div className="admin-settings">
      <header className="admin-page-header">
        <h1>Saiz teks karya</h1>
      </header>
      <section className="admin-section" aria-label="Saiz teks karya">
        <ReaderTypographySettings />
      </section>
    </div>
  );
}
