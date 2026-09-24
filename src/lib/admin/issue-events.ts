import { getDb } from "../db";

interface IssueEvent {
  id: string;
  issueId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string;
  actor: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export async function recordIssueEvent(
  issueId: string,
  action: string,
  fromStatus: string | null,
  toStatus: string,
  actor: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  const id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  await db
    .insertInto("editorial_issue_events")
    .values({
      id,
      issue_id: issueId,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      actor,
      metadata_json: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
    })
    .execute();
}

export async function getIssueEvents(issueId: string): Promise<IssueEvent[]> {
  const db = getDb();
  
  const events = await db
    .selectFrom("editorial_issue_events")
    .where("issue_id", "=", issueId)
    .selectAll()
    .orderBy("created_at", "desc")
    .execute();
  
  return events.map(event => ({
    id: event.id,
    issueId: event.issue_id,
    action: event.action,
    fromStatus: event.from_status,
    toStatus: event.to_status,
    actor: event.actor,
    metadata: event.metadata_json ? JSON.parse(event.metadata_json) : null,
    createdAt: event.created_at instanceof Date ? event.created_at.toISOString() : String(event.created_at),
  }));
}