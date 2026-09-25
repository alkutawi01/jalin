import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");
const VALID_TYPES = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];

const errors = [];
const slugs = new Set();

function validateWork(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { data } = matter(raw);
  const fileName = path.basename(filePath);

  if (!data.id || typeof data.id !== "string") {
    errors.push({ file: fileName, field: "id", message: "ID tidak ditemui atau bukan string" });
  }

  const slug = data.slug ?? path.basename(filePath, ".md");
  if (slugs.has(slug)) {
    errors.push({ file: fileName, field: "slug", message: `Slug "${slug}" sudah wujud` });
  }
  slugs.add(slug);

  if (!VALID_TYPES.includes(data.type)) {
    errors.push({ file: fileName, field: "type", message: `Type "${data.type}" tidak sah` });
  }

  if (!Array.isArray(data.credits) || data.credits.length === 0) {
    errors.push({ file: fileName, field: "credits", message: "Tiada credits ditemui" });
  } else {
    const hasEditor = data.credits.some(
      (c) => c.role === "final_editor" || c.role === "story_editor"
    );
    if (!hasEditor) {
      errors.push({ file: fileName, field: "credits", message: "Tiada editor manusia (final_editor/story_editor)" });
    }
  }

  if (Array.isArray(data.visuals)) {
    for (const visual of data.visuals) {
      if (!visual.src || typeof visual.src !== "string") {
        errors.push({ file: fileName, field: "visuals", message: `Visual "${visual.role ?? "unknown"}" tiada src` });
      }
      const provider = String(visual.provider || "");
      if (provider.toLowerCase() === "magnific" && !visual.creationId) {
        errors.push({
          file: fileName,
          field: "visuals",
          message: `Visual "${visual.role ?? visual.src}" tiada creationId`
        });
      }
    }
  }

  if (data.status === "ready" || data.status === "published") {
    const hasEditor = Array.isArray(data.credits) && data.credits.some(
      (c) => c.role === "final_editor"
    );
    if (!hasEditor) {
      errors.push({
        file: fileName,
        field: "status",
        message: `Karya "${data.status}" tiada editor manusia (final_editor)`
      });
    }
  }
}

if (fs.existsSync(WORKS_DIR)) {
  const files = fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith(".md"));
  for (const file of files) {
    validateWork(path.join(WORKS_DIR, file));
  }
}

if (errors.length === 0) {
  console.log("✅ Validasi berjaya — tiada ralat ditemui");
  process.exit(0);
} else {
  console.log(`❌ ${errors.length} ralat ditemui:\n`);
  for (const err of errors) {
    console.log(`  [${err.file}] ${err.field}: ${err.message}`);
  }
  process.exit(1);
}