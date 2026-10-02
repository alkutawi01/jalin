import type { ContentRepository } from "./repository";
import { MarkdownContentRepository } from "./markdown-repository";
import { DatabaseContentRepository } from "./database-repository";

type ContentSource = "markdown" | "database";

const CONTENT_SOURCE: ContentSource =
  (process.env.CONTENT_SOURCE as ContentSource) || "markdown";

let repositoryInstance: ContentRepository | null = null;
let initPromise: Promise<ContentRepository> | null = null;

function createRepository(): ContentRepository {
  const source = (process.env.CONTENT_SOURCE as ContentSource) || "markdown";
  switch (source) {
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

/**
 * The database repository loads every work once. A long-lived server instance
 * would otherwise keep showing old content (a new image, a status change)
 * until the next deploy, so it is reloaded when older than this.
 */
const DB_REFRESH_MS = 30_000;
let loadedAt = 0;

export async function initContentRepository(): Promise<ContentRepository> {
  if (repositoryInstance) {
    const stale =
      repositoryInstance instanceof DatabaseContentRepository && Date.now() - loadedAt > DB_REFRESH_MS;
    if (!stale) return repositoryInstance;
    if (!initPromise) {
      initPromise = loadFresh().finally(() => {
        initPromise = null;
      });
    }
    // Keep serving the previous content if the reload fails.
    return initPromise.catch((error) => {
      // Never fail silently: a stuck reload means readers keep seeing old content.
      console.error("[ContentRepository] muat semula gagal; memaparkan kandungan terdahulu", error);
      return repositoryInstance as ContentRepository;
    });
  }
  if (initPromise) return initPromise;

  // Clear the promise when done. Left set, the staleness check above never starts a reload and the
  // server would keep showing the content it loaded on its first request until the next deploy.
  initPromise = loadFresh().finally(() => {
    initPromise = null;
  });
  return initPromise;
}

async function loadFresh(): Promise<ContentRepository> {
  const repo = createRepository();
  if (repo instanceof DatabaseContentRepository && repo.isEnabled()) {
    await repo.init();
  }
  repositoryInstance = repo;
  loadedAt = Date.now();
  return repo;
}

export function resetContentRepository(): void {
  repositoryInstance = null;
  initPromise = null;
  loadedAt = 0;
}
