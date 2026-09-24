"use client";

import { useEffect, useState } from "react";
import { runEditorialAudit, syncEditorialIssuesAction } from "../../lib/admin/editorial-actions";

interface DashboardData {
  health: {
    authors: { status: string; issues: string[] };
    revisions: { status: string; issues: string[] };
    visuals: { status: string; issues: string[] };
    translations: { status: string; issues: string[] };
  };
  issues: {
    total: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  history: {
    recent: number;
    runs: Array<{ id: string; createdAt: string; summary: Record<string, string> }>;
  };
}

export function EditorialWorkflowDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchData = () => {
    setLoading(true);
    fetch("/api/admin/editorial-dashboard")
      .then(res => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunAudit = async () => {
    setActionMessage(null);
    const result = await runEditorialAudit();
    setActionMessage({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) fetchData();
  };

  const handleSyncIssues = async () => {
    setActionMessage(null);
    const result = await syncEditorialIssuesAction();
    setActionMessage({ type: result.success ? "success" : "error", text: result.message });
    if (result.success) fetchData();
  };

  if (loading) return <p>Loading dashboard...</p>;
  if (!data) return <p>Dashboard data not available</p>;

  return (
    <div className="admin-workflow-dashboard">
      <div className="admin-dashboard-actions">
        <button onClick={handleRunAudit} className="admin-btn">
          Run Audit
        </button>
        <button onClick={handleSyncIssues} className="admin-btn">
          Sync Issues
        </button>
        <a href="/api/admin/editorial-report" target="_blank" className="admin-btn">
          Export Report
        </a>
      </div>
      
      {actionMessage && (
        <div className={`admin-action-message admin-${actionMessage.type}`}>
          {actionMessage.text}
        </div>
      )}

      <div className="admin-dashboard-grid">
        <div className="admin-dashboard-section">
          <h3>Health</h3>
          <div className="admin-health-grid">
            {Object.entries(data.health).map(([category, info]) => (
              <div key={category} className={`admin-health-item admin-health-${info.status}`}>
                <span className="admin-health-label">{category}</span>
                <span className="admin-health-status">{info.status.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-dashboard-section">
          <h3>Issues</h3>
          <div className="admin-issue-stats">
            <div className="admin-stat">
              <span className="admin-stat-label">Total</span>
              <span className="admin-stat-value">{data.issues.total}</span>
            </div>
            {Object.entries(data.issues.byStatus).map(([status, count]) => (
              <div key={status} className="admin-stat">
                <span className="admin-stat-label">{status}</span>
                <span className="admin-stat-value">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="admin-dashboard-section">
          <h3>Recent Audits</h3>
          {data.history.runs.length === 0 ? (
            <p>No audit runs</p>
          ) : (
            <div className="admin-audit-list">
              {data.history.runs.map(run => (
                <div key={run.id} className="admin-audit-item">
                  <span>{new Date(run.createdAt).toLocaleDateString("ms-MY")}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}