import PromptEditor from "../../../components/admin/PromptEditor";
import AiPersonaSettings from "../../../components/admin/AiPersonaSettings";
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
        <p className="admin-page-sub">
          Arahan AI yang disalin oleh butang &quot;Salin Arahan AI&quot;. Format jawapan dikawal oleh sistem dan tidak boleh
          disunting di sini.
        </p>
      </header>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Peraturan am (semua jenis karya)</h2>
        <PromptEditor
          target="global"
          label="Peraturan am dan peraturan gambar"
          initial={first.globalRules}
          customised={first.globalCustomised}
        />
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Arahan ikut jenis karya</h2>
        {recipes.map(({ recipe, prompts }) => (
          <PromptEditor
            key={recipe.key}
            target={recipe.key}
            label={`${KIND_LABELS[recipe.kind]} — ${recipe.mode === "tulis" ? "chatbot menulis" : "data sahaja"}`}
            description={recipe.description}
            initial={prompts.recipeText}
            customised={prompts.recipeCustomised}
          />
        ))}
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Nama samaran AI</h2>
        <AiPersonaSettings />
      </section>

      <section className="admin-section">
        <h2 className="admin-form-section-title">Status sistem</h2>
        <ul>
          <li>Pangkalan data: {hasDb() ? "bersambung" : "tidak tersedia"}</li>
          <li>Storan gambar: {storage ? "ditetapkan" : "belum ditetapkan (gambar yang dimuat naik tidak kekal)"}</li>
        </ul>
      </section>
    </div>
  );
}
