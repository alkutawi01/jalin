import type { ContentRepository } from "./repository";
import { MarkdownContentRepository } from "./markdown-repository";
import { DatabaseContentRepository } from "./database-repository";

type ContentSource = "markdown" | "database";

const CONTENT_SOURCE: ContentSource =
  (process.env.CONTENT_SOURCE as ContentSource) || "markdown";

let repositoryInstance: ContentRepository | null = null;
let initPromise: Promise<ContentRepository> | null = null;

function createRepository(): ContentRepository {
  switch (CONTENT_SOURCE) {
    case "database": {
      const dbRepo = new DatabaseContentRepository();
      if (dbRepo.isEnabled()) {
        console.log("[ContentRepository] Using database source");
        return dbRepo;
      }
      console.warn(
        "[ContentRepository] DATABASE_URL not set, falling back to markdown"
      );
      return new MarkdownContentRepository();
    }
    case "markdown":
    default:
      console.log("[ContentRepository] Using markdown source");
      return new MarkdownContentRepository();
  }
}

export function getContentRepository(): ContentRepository {
  if (repositoryInstance) return repositoryInstance;
  repositoryInstance = createRepository();
  return repositoryInstance;
}

export async function initContentRepository(): Promise<ContentRepository> {
  if (repositoryInstance) return repositoryInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const repo = createRepository();
    if (repo instanceof DatabaseContentRepository && repo.isEnabled()) {
      await repo.init();
    }
    repositoryInstance = repo;
    return repo;
  })();

  return initPromise;
}

export function resetContentRepository(): void {
  repositoryInstance = null;
  initPromise = null;
}
