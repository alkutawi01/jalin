"use client";

import { useState } from "react";
import { runEditorialAudit, syncEditorialIssuesAction } from "../../lib/admin/editorial-actions";

/**
 * The two administrator actions: run the content checks now (which also records them and updates the issue list), or only update the issue list.
 * (This used to repeat the health cards, the issue count and the audit history that the dashboard already shows.)
 */
export function EditorialWorkflowDashboard() {
  const [busy, setBusy] = useState<"audit" | "sync" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function run(kind: "audit" | "sync") {
    setBusy(kind);
    setMessage(null);
    const result = kind === "audit" ? await runEditorialAudit() : await syncEditorialIssuesAction();
    setMessage({ type: result.success ? "success" : "error", text: result.message });
    setBusy(null);
  }

  return (
    <div className="a-tools">
      <div className="a-tools-row">
        <button type="button" onClick={() => run("audit")} disabled={busy !== null} className="admin-btn">
          {busy === "audit" ? "Menjalankan…" : "Jalankan semakan"}
        </button>
        <button type="button" onClick={() => run("sync")} disabled={busy !== null} className="admin-btn">
          {busy === "sync" ? "Menyegerakkan…" : "Segerakkan isu"}
        </button>
      </div>
      <p className="admin-form-hint">
        &quot;Jalankan semakan&quot; memeriksa semua karya terbit, menyimpan satu rekod dalam sejarah dan mengemas kini senarai isu.
        &quot;Segerakkan isu&quot; hanya mengemas kini senarai isu.
      </p>
      {message ? (
        <div className={`admin-alert admin-alert-${message.type}`} role="status">{message.text}</div>
      ) : null}
    </div>
  );
}
