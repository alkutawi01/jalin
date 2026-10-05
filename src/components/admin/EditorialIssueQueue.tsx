"use client";

import { useEffect, useState } from "react";
import { CHECK_LABELS, ISSUE_STATE_LABELS, SEVERITY_LABELS } from "../../lib/admin/dashboard-labels";

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

export function EditorialIssueQueue() {
  const [issues, setIssues] = useState<EditorialIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("open");

  const fetchIssues = () => {
    setLoading(true);
    const url = filter === "all" 
      ? "/api/admin/editorial-issues"
      : `/api/admin/editorial-issues?status=${filter}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => {
        setIssues(data.issues || []);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchIssues();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    await fetch(`/api/admin/editorial-issues/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchIssues();
  };

  if (loading) {
    return <p className="admin-form-hint">Memuatkan isu…</p>;
  }

  return (
    <div className="admin-issue-queue">
      <div className="admin-issue-filters">
        {["all", "open", "resolved", "ignored"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`admin-filter-btn ${filter === f ? "active" : ""}`}
          >
            {ISSUE_STATE_LABELS[f] ?? f}
          </button>
        ))}
      </div>
      
      {issues.length === 0 ? (
        <p className="admin-form-hint">Tiada isu dalam senarai ini.</p>
      ) : (
        <div className="admin-issue-list">
          {issues.map(issue => (
            <div key={issue.id} className={`admin-issue-card admin-severity-${issue.severity}`}>
              <div className="admin-issue-header">
                <span className="admin-issue-type">{CHECK_LABELS[issue.type as keyof typeof CHECK_LABELS]?.title ?? issue.type}</span>
                <span className="admin-issue-severity">{SEVERITY_LABELS[issue.severity] ?? issue.severity}</span>
                <span className={`admin-issue-status admin-status-${issue.status}`}>
                  {ISSUE_STATE_LABELS[issue.status] ?? issue.status}
                </span>
              </div>
              <p className="admin-issue-message">{issue.message}</p>
              {issue.status === "open" && (
                <div className="admin-issue-actions">
                  <button onClick={() => updateStatus(issue.id, "resolved")}>
                    Tandakan selesai
                  </button>
                  <button onClick={() => updateStatus(issue.id, "ignored")}>
                    Abaikan
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}