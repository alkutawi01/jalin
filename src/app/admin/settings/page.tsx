import PromptEditor from "../../../components/admin/PromptEditor";
import AiPersonaSettings from "../../../components/admin/AiPersonaSettings";
import SiteCopySettings from "../../../components/admin/SiteCopySettings";
import SiteThemeSettings from "../../../components/admin/SiteThemeSettings";
import ReaderTypographySettings from "../../../components/admin/ReaderTypographySettings";
import AudienceBandsSettings from "../../../components/admin/AudienceBandsSettings";
import SettingsHashRedirect from "../../../components/admin/SettingsHashRedirect";
import { loadPrompts } from "../../../lib/admin/authoring/prompt-store";
import { RECIPE_KEYS, getRecipe, KIND_LABELS } from "../../../lib/admin/authoring/recipes";
import { redirect } from "next/navigation";
import { SETTINGS_TABS, movedTabTarget, settingsTabHref, settingsTabOf } from "../../../lib/admin/settings-tabs";

export const dynamic = "force-dynamic";

/** The AI instructions are long and are only read when their tab is open. */
async function AiPromptsPanel() {
  const first = await loadPrompts(RECIPE_KEYS[0]!);
  const recipes = await Promise.all(
    RECIPE_KEYS.map(async (key) => ({ recipe: getRecipe(key), prompts: await loadPrompts(key) }))
  );
  return (
    <>
      <p className="admin-form-hint">Teks yang disalin oleh butang &quot;Salin arahan AI&quot; apabila menambah karya. Format jawapan dikawal oleh sistem dan tidak boleh disunting di sini.</p>
      <details className="a-settings-fold">
        <summary>Peraturan am (semua jenis karya)</summary>
        <PromptEditor
          target="global"
          label="Peraturan am dan peraturan gambar"
          initial={first.globalRules}
          customised={first.globalCustomised}
        />
      </details>
      {recipes.map(({ recipe, prompts }) => (
        <details className="a-settings-fold" key={recipe.key}>
          <summary>{KIND_LABELS[recipe.kind]} — {recipe.mode === "tulis" ? "bot sembang menulis" : "data sahaja"}{prompts.recipeCustomised ? " · diubah suai" : ""}</summary>
          <PromptEditor
            target={recipe.key}
            label={`${KIND_LABELS[recipe.kind]} — ${recipe.mode === "tulis" ? "bot sembang menulis" : "data sahaja"}`}
            description={recipe.description}
            initial={prompts.recipeText}
            customised={prompts.recipeCustomised}
          />
        </details>
      ))}
    </>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const asked = (await searchParams).tab;
  const moved = movedTabTarget(asked);
  if (moved) redirect(moved);
  const tab = settingsTabOf(asked);
  const label = SETTINGS_TABS.find((t) => t.id === tab)!.label;

  return (
    <div className="admin-form-page">
      <SettingsHashRedirect current={tab} />
      <header className="admin-page-header">
        <h1>Tetapan</h1>
        <p className="admin-page-sub">Setiap bahagian ada tabnya sendiri.</p>
        {/* Real tabs: one panel on the page at a time, each tab its own address. */}
        <nav className="a-settings-tabs" aria-label="Bahagian Tetapan">
          {SETTINGS_TABS.map((t) => (
            <a key={t.id} href={settingsTabHref(t.id)} className={t.id === tab ? "active" : undefined} aria-current={t.id === tab ? "page" : undefined}>
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="admin-section a-settings-panel" id={tab} aria-label={label}>
        <h2 className="admin-form-section-title">{label}</h2>

        {tab === "teks-awam" ? (
          <>
            <p className="admin-form-hint">Ayat pengenalan yang pembaca lihat di atas setiap halaman senarai (Cerpen, Novela, Bersiri dan lain-lain).</p>
            <SiteCopySettings />
          </>
        ) : null}

        {tab === "warna-blok" ? <SiteThemeSettings /> : null}

        {tab === "saiz-teks" ? <ReaderTypographySettings /> : null}

        {tab === "audiens" ? <AudienceBandsSettings /> : null}

        {tab === "nama-samaran" ? (
          <>
            <p className="admin-form-hint">Nama yang dipaparkan kepada pembaca bagi penulis AI.</p>
            <AiPersonaSettings />
          </>
        ) : null}

        {tab === "arahan-ai" ? <AiPromptsPanel /> : null}

        {tab === "alat-lain" ? (
          <ul>
            <li><a href="/admin/submissions">Penghantaran karya</a> — karya yang dihantar untuk disemak dan dinaikkan menjadi karya.</li>
            <li><a href="/admin/prompts">Templat arahan lama</a> — templat arahan terdahulu; arahan semasa disunting dalam tab Arahan AI.</li>
          </ul>
        ) : null}
      </section>
    </div>
  );
}
