export async function runEditorialAudit(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/editorial-report");
    if (!response.ok) {
      throw new Error("Audit failed");
    }
    const data = await response.json();
    return { success: true, message: `Audit completed. Issues: ${data.issues?.length || 0}` };
  } catch (error) {
    return { success: false, message: "Failed to run audit" };
  }
}

export async function syncEditorialIssuesAction(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/editorial-issues", { method: "POST" });
    if (!response.ok) {
      throw new Error("Sync failed");
    }
    const data = await response.json();
    return { 
      success: true, 
      message: `Synced: ${data.created} created, ${data.resolved} resolved, ${data.reopened} reopened` 
    };
  } catch (error) {
    return { success: false, message: "Failed to sync issues" };
  }
}