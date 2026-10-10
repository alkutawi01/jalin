import { initContentRepository } from "../content";
import { projectPublicWorkSummary } from "./public-projection";

/** The pictures of the published works that are not excerpts (fragmen and sinopsis belong to other authors' books). */
export async function wallSources(): Promise<string[]> {
  const repo = await initContentRepository();
  return repo
    .getWorks()
    .filter((w) => w.type !== "sinopsis" && w.type !== "fragmen")
    .map((w) => projectPublicWorkSummary(w).hero?.src ?? "")
    .filter((src) => src.length > 0);
}
