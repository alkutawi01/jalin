import type { ContentRepository } from "./repository";
import { MarkdownContentRepository } from "./markdown-repository";
import { DatabaseContentRepository } from "./database-repository";

type ContentSource = "markdown" | "database";

const CONTENT_SOURCE: ContentSource =
  (process.env.CONTENT_SOURCE as ContentSource) || "markdown";

let repositoryInstance: ContentRepository | null = null;

export function getContentRepository(): ContentRepository {
  if (repositoryInstance) {
    return repositoryInstance;
  }

  switch (CONTENT_SOURCE) {
    case "database": {
      const dbRepo = new DatabaseContentRepository();
      if (dbRepo.isEnabled()) {
        repositoryInstance = dbRepo;
        console.log("[ContentRepository] Using database source");
      } else {
        console.warn(
          "[ContentRepository] DATABASE_URL not set, falling back to markdown"
        );
        repositoryInstance = new MarkdownContentRepository();
      }
      break;
    }
    case "markdown":
    default:
      repositoryInstance = new MarkdownContentRepository();
      console.log("[ContentRepository] Using markdown source");
      break;
  }

  return repositoryInstance;
}

export function resetContentRepository(): void {
  repositoryInstance = null;
}
