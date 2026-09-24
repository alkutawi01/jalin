"use client";

import { useEffect, useState } from "react";

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
    return <p>Loading issues...</p>;
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
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      
      {issues.length === 0 ? (
        <p>No issues found</p>
      ) : (
        <div className="admin-issue-list">
          {issues.map(issue => (
            <div key={issue.id} className={`admin-issue-card admin-severity-${issue.severity}`}>
              <div className="admin-issue-header">
                <span className="admin-issue-type">{issue.type}</span>
                <span className={`admin-issue-status admin-status-${issue.status}`}>
                  {issue.status}
                </span>
              </div>
              <p className="admin-issue-message">{issue.message}</p>
              {issue.status === "open" && (
                <div className="admin-issue-actions">
                  <button onClick={() => updateStatus(issue.id, "resolved")}>
                    Mark Resolved
                  </button>
                  <button onClick={() => updateStatus(issue.id, "ignored")}>
                    Ignore
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