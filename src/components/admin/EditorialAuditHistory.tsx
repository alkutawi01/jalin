"use client";

import { useEffect, useState } from "react";
import { CHECK_LABELS, statusLabel } from "../../lib/admin/dashboard-labels";

interface AuditRun {
  id: string;
  generatedAt: string;
  summary: Record<string, string>;
  issues: string[];
  createdAt: string;
}

export function EditorialAuditHistory() {
  const [runs, setRuns] = useState<AuditRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/editorial-history")
      .then(res => res.json())
      .then(data => {
        setRuns(data.runs || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className="admin-form-hint">Memuatkan sejarah…</p>;
  }

  if (runs.length === 0) {
    return <p className="admin-form-hint">Belum ada semakan yang direkodkan. Tekan "Jalankan semakan".</p>;
  }

  return (
    <div className="admin-audit-history">
      {runs.map((run) => (
        <div key={run.id} className="admin-audit-run">
          <p className="admin-audit-date">
            {new Date(run.createdAt).toLocaleString("ms-MY")}
          </p>
          <div className="admin-audit-summary">
            {Object.entries(run.summary).map(([category, status]) => (
              <span key={category} className={`admin-audit-status admin-audit-${status}`}>
                {CHECK_LABELS[category as keyof typeof CHECK_LABELS]?.title ?? category}: {statusLabel(String(status))}
              </span>
            ))}
          </div>
          {run.issues.length > 0 && (
            <ul className="admin-audit-issues">
              {run.issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}