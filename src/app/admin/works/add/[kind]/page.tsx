import { notFound } from "next/navigation";
import AuthoringForm from "../../../../../components/admin/AuthoringForm";
import {
  KIND_LABELS,
  WORK_KINDS,
  kindHasBothModes,
  recipeFor,
  type AuthoringMode,
  type WorkKind
} from "../../../../../lib/admin/authoring/recipes";
import { listSeriesOptions } from "../../../../../lib/admin/authoring/series-context";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ mod?: string; siri?: string }>;
}

export default async function AddWorkKindPage({ params, searchParams }: PageProps) {
  const { kind: rawKind } = await params;
  const { mod, siri } = await searchParams;
  if (!WORK_KINDS.includes(rawKind as WorkKind)) notFound();
  const kind = rawKind as WorkKind;
  const base = `/admin/works/add/${kind}`;

  const header = (sub: string) => (
    <header className="admin-page-header">
      <p className="admin-form-hint">
        <a href={`/admin/works/add?jenis=${kind}`}>← Cara bermula</a>
      </p>
      <h1>Tambah {KIND_LABELS[kind]}</h1>
      <p className="admin-page-sub">{sub}</p>
    </header>
  );

  // Bersiri: new series or continue an existing one.
  if (kind === "bersiri" && !siri) {
    const options = await listSeriesOptions();
    return (
      <div className="admin-form-page">
        {header("Episod ini bagi siri yang mana?")}
        {options.length === 0 ? (
          <div className="a-empty-state">
            <strong>Belum ada siri.</strong>
            <p>Siri dicipta di tab Siri. Selepas itu, tambah episod pertamanya dari halaman siri itu.</p>
            <a className="admin-btn admin-btn-primary" href="/admin/series/new">Cipta siri baharu</a>
          </div>
        ) : (
          <div className="admin-choice-grid">
            {options.map((s) => (
              <a key={s.id} href={`${base}?siri=${encodeURIComponent(s.id)}`} className="admin-choice">
                <strong>{s.title}</strong>
                <span>{s.episodes === 0 ? "Belum ada episod: ini akan menjadi episod pertama" : `${s.episodes} episod setakat ini`}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Sinopsis / fragmen: chatbot writes it, or the editor already has it.
  if (kindHasBothModes(kind) && mod !== "data" && mod !== "tulis") {
    return (
      <div className="admin-form-page">
        {header("Siapa yang menulis teksnya?")}
        <div className="admin-choice-grid">
          <a href={`${base}?mod=tulis`} className="admin-choice">
            <strong>Chatbot menulis sepenuhnya</strong>
            <span>Anda beri maklumat karya sumber; chatbot menulis teks dan menyediakan semua data.</span>
          </a>
          <a href={`${base}?mod=data`} className="admin-choice">
            <strong>Saya sudah ada teksnya</strong>
            <span>Chatbot hanya mengeluarkan data (sumber, glosari, gambar) daripada teks anda.</span>
          </a>
        </div>
      </div>
    );
  }

  const mode: AuthoringMode = kindHasBothModes(kind) ? (mod as AuthoringMode) : "data";
  const recipe = recipeFor(kind, mode);

  let series: { kind: "baharu" } | { kind: "sambung"; seriesId: string; title: string } | null = null;
  if (kind === "bersiri") {
    if (siri === "baharu") series = { kind: "baharu" };
    else {
      const options = await listSeriesOptions();
      const found = options.find((s) => s.id === siri);
      if (!found) notFound();
      series = { kind: "sambung", seriesId: found.id, title: found.title };
    }
  }

  return (
    <div className="admin-form-page">
      {header(recipe.description)}
      <AuthoringForm recipeKey={recipe.key} needsManuscript={recipe.needsManuscript} series={series} />
    </div>
  );
}
