"use client";

export function ExportReportButton() {
  const handleExport = async (format: "json" | "markdown") => {
    try {
      const response = await fetch("/api/admin/editorial-report");
      if (!response.ok) {
        alert("Gagal memuat turun laporan");
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
        let md = `# Editorial Health Report\n\n`;
        md += `Generated: ${new Date(data.generatedAt).toLocaleString("ms-MY")}\n\n`;
        
        for (const [category, info] of Object.entries(data.summary)) {
          const status = (info as string).toUpperCase();
          md += `## ${category.charAt(0).toUpperCase() + category.slice(1)}\n`;
          md += `Status: ${status}\n\n`;
        }
        
        if (data.issues.length > 0) {
          md += `## Issues\n\n`;
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
      alert("Ralat semasa memuat turun laporan");
    }
  };

  return (
    <div className="admin-export-buttons">
      <button onClick={() => handleExport("json")} className="admin-btn">
        Export JSON
      </button>
      <button onClick={() => handleExport("markdown")} className="admin-btn">
        Export Markdown
      </button>
    </div>
  );
}