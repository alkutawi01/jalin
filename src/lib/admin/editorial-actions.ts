export async function runEditorialAudit(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/editorial-report");
    if (!response.ok) {
      throw new Error("Semakan gagal");
    }
    const data = await response.json();
    return { success: true, message: data.issues?.length ? `Semakan selesai. ${data.issues.length} perkara perlu diberi perhatian.` : "Semakan selesai. Tiada perkara yang perlu dibaiki." };
  } catch (error) {
    return { success: false, message: "Semakan tidak dapat dijalankan. Cuba lagi sebentar lagi." };
  }
}

export async function syncEditorialIssuesAction(): Promise<{ success: boolean; message: string }> {
  try {
    const response = await fetch("/api/admin/editorial-issues", { method: "POST" });
    if (!response.ok) {
      throw new Error("Penyegerakan gagal");
    }
    const data = await response.json();
    return { 
      success: true, 
      message: `Isu dikemas kini: ${data.created} baharu, ${data.resolved} selesai, ${data.reopened} dibuka semula.`
    };
  } catch (error) {
    return { success: false, message: "Isu tidak dapat disegerakkan. Cuba lagi sebentar lagi." };
  }
}