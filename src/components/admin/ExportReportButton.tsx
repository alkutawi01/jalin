"use client";
import { toast } from "../../lib/admin/dialogs";
import { CHECK_LABELS, statusLabel } from "../../lib/admin/dashboard-labels";

export function ExportReportButton() {
  const handleExport = async (format: "json" | "markdown") => {
    try {
      const response = await fetch("/api/admin/editorial-report");
      if (!response.ok) {
        toast("Gagal memuat turun laporan", "error");
        return;
      }
      
      const data = await response.json();
      
      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `editorial-report-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        let md = `# Laporan Kesihatan Editorial\n\n`;
        md += `Dijana: ${new Date(data.generatedAt).toLocaleString("ms-MY")}\n\n`;
        
        for (const [category, info] of Object.entries(data.summary)) {
          const status = statusLabel(info as string);
          md += `## ${CHECK_LABELS[category as keyof typeof CHECK_LABELS]?.title ?? category}\n`;
          md += `Status: ${status}\n\n`;
        }
        
        if (data.issues.length > 0) {
          md += `## Isu\n\n`;
          for (const issue of data.issues) {
            md += `- ${issue}\n`;
          }
        }
        
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `editorial-report-${new Date().toISOString().split("T")[0]}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      toast("Ralat semasa memuat turun laporan", "error");
    }
  };

  return (
    <div className="admin-export-buttons">
      <button onClick={() => handleExport("json")} className="admin-btn">
        Eksport JSON
      </button>
      <button onClick={() => handleExport("markdown")} className="admin-btn">
        Eksport Markdown
      </button>
    </div>
  );
}