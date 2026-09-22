import type { Work, WorkType } from "./types";
import type { ContributorMeta } from "./contributors";
import type { ContentRepository } from "./repository";

export class DatabaseContentRepository implements ContentRepository {
  private enabled = false;

  constructor() {
    this.enabled = !!process.env.DATABASE_URL;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  getWork(_slug: string): Work | undefined {
    if (!this.enabled) {
      console.warn("[DatabaseContentRepository] Not enabled. Set DATABASE_URL to enable.");
      return undefined;
    }
    throw new Error("DatabaseContentRepository.getWork() not implemented yet");
  }

  getWorks(): Work[] {
    if (!this.enabled) {
      console.warn("[DatabaseContentRepository] Not enabled. Set DATABASE_URL to enable.");
      return [];
    }
    throw new Error("DatabaseContentRepository.getWorks() not implemented yet");
  }

  getWorksByType(_type: WorkType): Work[] {
    if (!this.enabled) {
      console.warn("[DatabaseContentRepository] Not enabled. Set DATABASE_URL to enable.");
      return [];
    }
    throw new Error("DatabaseContentRepository.getWorksByType() not implemented yet");
  }

  getContributor(_slug: string): ContributorMeta | undefined {
    if (!this.enabled) {
      console.warn("[DatabaseContentRepository] Not enabled. Set DATABASE_URL to enable.");
      return undefined;
    }
    throw new Error("DatabaseContentRepository.getContributor() not implemented yet");
  }

  getContributors(): ContributorMeta[] {
    if (!this.enabled) {
      console.warn("[DatabaseContentRepository] Not enabled. Set DATABASE_URL to enable.");
      return [];
    }
    throw new Error("DatabaseContentRepository.getContributors() not implemented yet");
  }
}
