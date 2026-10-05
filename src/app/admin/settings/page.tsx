import PromptEditor from "../../../components/admin/PromptEditor";
import AiPersonaSettings from "../../../components/admin/AiPersonaSettings";
import SiteCopySettings from "../../../components/admin/SiteCopySettings";
import AudienceBandsSettings from "../../../components/admin/AudienceBandsSettings";
import { loadPrompts } from "../../../lib/admin/authoring/prompt-store";
import { RECIPE_KEYS, getRecipe, KIND_LABELS } from "../../../lib/admin/authoring/recipes";
import { hasDb } from "../../../lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const first = await loadPrompts(RECIPE_KEYS[0]!);
  const recipes = await Promise.all(
    RECIPE_KEYS.map(async (key) => ({ recipe: getRecipe(key), prompts: await loadPrompts(key) }))
  );
  const storage = Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.OBJECT_STORAGE_BUCKET || process.env.OBJECT_STORAGE_ENDPOINT);

  return (
    <div className="admin-form-page">
      <header className="admin-page-header">
        <h1>Tetapan</h1>
        <p className="admin-page-sub">Pilih bahagian di bawah. Apa yang paling kerap diubah ada di atas; arahan AI yang panjang dilipat.</p>
        <nav className="a-settings-nav" aria-label="Bahagian Tetapan">
          <a href="#teks-awam">Teks halaman awam</a>
          <a href="#audiens">Audiens</a>
          <a href="#nama-samaran">Nama samaran AI</a>
          <a href="#arahan-ai">Arahan AI</a>
          <a href="#alat-lain">Alat lain</a>
          <a href="#status-sistem">Status sistem</a>
        </nav>
      </header>

      <section className="admin-section" id="teks-awam">
        <h2 className="admin-form-section-title">Teks halaman awam</h2>
        <p className="admin-form-hint">Ayat pengenalan yang pembaca lihat di atas setiap halaman senarai (Cerpen, Novela, Bersiri dan lain-lain).</p>
        <SiteCopySettings />
      </section>

      <section className="admin-section" id="audiens">
        <h2 className="admin-form-section-title">Audiens</h2>
        <AudienceBandsSettings />
      </section>

      <section className="admin-section" id="nama-samaran">
        <h2 className="admin-form-section-title">Nama samaran AI</h2>
        <p className="admin-form-hint">Nama yang dipaparkan kepada pembaca bagi penulis AI.</p>
        <AiPersonaSettings />
      </section>

      <section className="admin-section" id="arahan-ai">
        <h2 className="admin-form-section-title">Arahan AI</h2>
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
            <summary>{KIND_LABELS[recipe.kind]} — {recipe.mode === "tulis" ? "chatbot menulis" : "data sahaja"}{prompts.recipeCustomised ? " · diubah suai" : ""}</summary>
            <PromptEditor
              target={recipe.key}
              label={`${KIND_LABELS[recipe.kind]} — ${recipe.mode === "tulis" ? "chatbot menulis" : "data sahaja"}`}
              description={recipe.description}
              initial={prompts.recipeText}
              customised={prompts.recipeCustomised}
            />
          </details>
        ))}
      </section>

      <section className="admin-section" id="alat-lain">
        <h2 className="admin-form-section-title">Alat lain</h2>
        <ul>
          <li><a href="/admin/submissions">Penghantaran karya</a> — karya yang dihantar untuk disemak dan dinaikkan menjadi karya.</li>
          <li><a href="/admin/prompts">Templat arahan lama</a> — templat arahan terdahulu; arahan semasa disunting di atas.</li>
        </ul>
      </section>

      <section className="admin-section" id="status-sistem">
        <h2 className="admin-form-section-title">Status sistem</h2>
        <ul>
          <li>Pangkalan data: {hasDb() ? "bersambung" : "tidak tersedia"}</li>
          <li>Storan gambar: {storage ? "ditetapkan" : "belum ditetapkan (gambar yang dimuat naik tidak kekal)"}</li>
        </ul>
      </section>
    </div>
  );
}
