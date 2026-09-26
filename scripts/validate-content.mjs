import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import matter from "gray-matter";

const CONTENT_DIR = path.join(process.cwd(), "content");
const WORKS_DIR = path.join(CONTENT_DIR, "works");
const VALID_TYPES = ["cerpen", "novela", "bersiri", "fragmen", "sinopsis"];
const DERIVATIVE_TYPES = new Set(["fragmen", "sinopsis"]);

export function isDerivativeEntry(data) {
  return (
    DERIVATIVE_TYPES.has(data.type) &&
    data.sourceWork !== null &&
    typeof data.sourceWork === "object" &&
    typeof data.sourceWork.title === "string" &&
    data.sourceWork.title.trim() !== ""
  );
}

export function validateFrontmatter(data, fileName, slugs = new Set()) {
  const errors = [];
  const derivative = isDerivativeEntry(data);

  if (!data.id || typeof data.id !== "string") {
    errors.push({ file: fileName, field: "id", message: "ID tidak ditemui atau bukan string" });
  }

  const slug = data.slug ?? path.basename(fileName, ".md");
  if (slugs.has(slug)) {
    errors.push({ file: fileName, field: "slug", message: `Slug "${slug}" sudah wujud` });
  }
  slugs.add(slug);

  if (!VALID_TYPES.includes(data.type)) {
    errors.push({ file: fileName, field: "type", message: `Type "${data.type}" tidak sah` });
  }

  if (!Array.isArray(data.credits) || data.credits.length === 0) {
    errors.push({ file: fileName, field: "credits", message: "Tiada credits ditemui" });
  } else if (derivative) {
    const hasAuthor = data.credits.some((c) => c && c.role === "author");
    if (!hasAuthor) {
      errors.push({
        file: fileName,
        field: "credits",
        message: "Karya derivative: tiada kredit pengarang asal (role: author)"
      });
    }
  } else {
    const hasEditor = data.credits.some(
      (c) => c && (c.role === "final_editor" || c.role === "story_editor")
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

  if ((data.status === "ready" || data.status === "published") && !derivative) {
    const hasFinalEditor = Array.isArray(data.credits) && data.credits.some(
      (c) => c && c.role === "final_editor"
    );
    if (!hasFinalEditor) {
      errors.push({
        file: fileName,
        field: "status",
        message: `Karya "${data.status}" tiada editor manusia (final_editor)`
      });
    }
  }

  return errors;
}

function main() {
  const errors = [];
  const slugs = new Set();

  if (fs.existsSync(WORKS_DIR)) {
    const files = fs.readdirSync(WORKS_DIR).filter((f) => f.endsWith(".md"));
    for (const file of files) {
      const raw = fs.readFileSync(path.join(WORKS_DIR, file), "utf8");
      const { data } = matter(raw);
      errors.push(...validateFrontmatter(data, file, slugs));
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
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
