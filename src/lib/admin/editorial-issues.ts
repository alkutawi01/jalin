import { getDb } from "../db";
import { getEditorialHealth } from "./editorial-health";

interface EditorialIssue {
  id: string;
  type: string;
  workId: string | null;
  severity: "high" | "medium" | "low";
  status: "open" | "ignored" | "resolved";
  message: string;
  createdAt: string;
  resolvedAt: string | null;
}

export async function syncEditorialIssues(): Promise<{ created: number; resolved: number; reopened: number }> {
  const db = getDb();
  const health = await getEditorialHealth();
  
  let created = 0;
  let resolved = 0;
  let reopened = 0;
  
  // Process each category
  const categories = [
    { name: "authors", severity: "high" as const },
    { name: "revisions", severity: "high" as const },
    { name: "visuals", severity: "medium" as const },
    { name: "translations", severity: "low" as const },
  ];
  
  for (const category of categories) {
    const healthCategory = health[category.name as keyof typeof health];
    
    if (healthCategory.status === "pass") {
      // Resolve all open issues for this category
      const openIssues = await db
        .selectFrom("editorial_issues")
        .where("type", "=", category.name)
        .where("status", "=", "open")
        .selectAll()
        .execute();
      
      for (const issue of openIssues) {
        await db
          .updateTable("editorial_issues")
          .where("id", "=", issue.id)
          .set({
            status: "resolved",
            resolved_at: new Date().toISOString(),
          })
          .execute();
        resolved++;
      }
    } else {
      // Create issues for each problem
      for (const message of healthCategory.issues) {
        // Check if issue already exists (open OR resolved)
        const existingOpen = await db
          .selectFrom("editorial_issues")
          .where("type", "=", category.name)
          .where("message", "=", message)
          .where("status", "=", "open")
          .select("id")
          .executeTakeFirst();
        
        if (existingOpen) {
          // Issue already exists and is open - skip
          continue;
        }
        
        // Check if there's a resolved issue for the same problem
        const existingResolved = await db
          .selectFrom("editorial_issues")
          .where("type", "=", category.name)
          .where("message", "=", message)
          .where("status", "=", "resolved")
          .select("id")
          .executeTakeFirst();
        
        if (existingResolved) {
          // Reopen the resolved issue
          await db
            .updateTable("editorial_issues")
            .where("id", "=", existingResolved.id)
            .set({
              status: "open",
              resolved_at: null,
            })
            .execute();
          reopened++;
        } else {
          // Create new issue
          const id = `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await db
            .insertInto("editorial_issues")
            .values({
              id,
              type: category.name,
              work_id: null,
              severity: category.severity,
              status: "open",
              message,
              created_at: new Date().toISOString(),
            })
            .execute();
          created++;
        }
      }
    }
  }
  
  return { created, resolved, reopened };
}

export async function getEditorialIssues(status?: string): Promise<EditorialIssue[]> {
  const db = getDb();
  
  let query = db.selectFrom("editorial_issues").selectAll();
  
  if (status) {
    query = query.where("status", "=", status);
  }
  
  const issues = await query.orderBy("created_at", "desc").execute();
  
  return issues.map(issue => ({
    id: issue.id,
    type: issue.type,
    workId: issue.work_id,
    severity: issue.severity as "high" | "medium" | "low",
    status: issue.status as "open" | "ignored" | "resolved",
    message: issue.message,
    createdAt: issue.created_at instanceof Date ? issue.created_at.toISOString() : String(issue.created_at),
    resolvedAt: issue.resolved_at instanceof Date ? issue.resolved_at.toISOString() : issue.resolved_at ? String(issue.resolved_at) : null,
  }));
}