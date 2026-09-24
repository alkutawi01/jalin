import { getDb } from "../db";
import { getEditorialReport } from "./editorial-health";

interface AuditRun {
  id: string;
  generatedAt: string;
  summary: Record<string, string>;
  issues: string[];
  createdAt: string;
}

export async function saveAuditRun(): Promise<string> {
  const db = getDb();
  const report = await getEditorialReport();
  
  const id = `audit_${Date.now()}`;
  const now = new Date().toISOString();
  
  await db
    .insertInto("editorial_audit_runs")
    .values({
      id,
      generated_at: report.generatedAt,
      summary_json: JSON.stringify(report.summary),
      issues_json: JSON.stringify(report.issues),
      created_by: "system",
      created_at: now,
    })
    .execute();
  
  return id;
}

export async function getAuditHistory(limit: number = 10): Promise<AuditRun[]> {
  const db = getDb();
  
  const runs = await db
    .selectFrom("editorial_audit_runs")
    .selectAll()
    .orderBy("editorial_audit_runs.created_at" as any, "desc")
    .limit(limit)
    .execute();
  
  return runs.map((run: any) => ({
    id: run.id,
    generatedAt: run.generated_at,
    summary: JSON.parse(run.summary_json),
    issues: JSON.parse(run.issues_json),
    createdAt: run.created_at,
  }));
}