"use client";

import { useRef, useState } from "react";
import { errorText } from "../../../lib/admin/error-text";
import { confirmAction, toast } from "../../../lib/admin/dialogs";
import type { StaffUser } from "../../../lib/admin/user-service";

type Role = StaffUser["role"];

/** Role descriptions in plain words, shown beside the choice so the owner knows what each role may do. */
const ROLE_HELP: Record<Role, string> = {
  editor: "Menulis dan menyunting karya, kredit, glosari dan gambar. Tidak boleh menerbitkan.",
  chief_editor: "Semua yang penyunting boleh, serta menyemak gambar, mengurus siri dan sumber, menjana dengan AI dan memilih Pilihan Editor. Tidak boleh menerbitkan."
};

/** What the list says of an account that has not been used yet: still waiting for the first sign-in (until when), or the invitation ran out. */
function inviteState(user: StaffUser): string {
  if (!user.mustChangePassword) return "";
  if (user.lastLoginAt || !user.inviteExpiresAt) return " · belum tukar kata laluan";
  const end = new Date(user.inviteExpiresAt);
  if (end.getTime() < Date.now()) return " · jemputan tamat tempoh";
  return ` · menunggu log masuk pertama (sah hingga ${end.toLocaleDateString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", day: "numeric", month: "short" })})`;
}

async function api(url: string, method: string, body?: unknown) {
  const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Tindakan tidak berjaya.");
  return data;
}

export default function UsersPanel({ initialUsers, roleNames }: { initialUsers: StaffUser[]; roleNames: Record<Role, string> }) {
  const [users, setUsers] = useState(initialUsers);
  const [form, setForm] = useState({ note: "", role: "editor" as Role });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{ title: string; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);

  function replace(user: StaffUser) {
    setUsers((list) => list.map((u) => (u.id === user.id ? user : u)));
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // Only the role is needed: the username and password are made here, and the person gives their own name when they first sign in.
      const data = await api("/api/admin/users", "POST", { displayName: form.note, role: form.role });
      setUsers((list) => [...list, data.user]);
      setInvitation({ title: form.note.trim() ? `Jemputan untuk ${data.user.displayName}` : "Jemputan baharu", text: data.invitation });
      setForm({ note: "", role: form.role });
      toast("Jemputan sedia. Salin dan hantar kepada orang itu.", "success");
    } catch (err) {
      const text = errorText(err);
      setError(text);
      toast(`Akaun tidak dapat dicipta: ${text}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function change(user: StaffUser, patch: { role?: Role; active?: boolean }) {
    if (patch.active === false && !(await confirmAction(`Matikan akaun ${user.displayName}? Orang ini tidak dapat log masuk lagi.`, { confirmLabel: "Ya, matikan akaun", danger: true }))) return;
    setError(null);
    try {
      const data = await api(`/api/admin/users/${user.id}`, "PATCH", patch);
      replace(data.user);
      // Every change says it worked (a role chosen from the list used to change with no word at all).
      toast(
        patch.active === false ? `Akaun ${user.displayName} dimatikan.`
          : patch.active === true ? `Akaun ${user.displayName} diaktifkan.`
          : `Peranan ${user.displayName} ditukar kepada ${roleNames[data.user.role as Role] ?? data.user.role}.`,
        "success"
      );
    } catch (err) {
      const text = errorText(err);
      setError(text);
      toast(`${user.displayName}: ${text}`, "error");
      // The list still shows the old role: the select is driven by the saved user, so a refused choice springs back by itself.
    }
  }

  async function reset(user: StaffUser) {
    const unused = user.mustChangePassword && !user.lastLoginAt;
    if (!(await confirmAction(
      unused ? `Hantar jemputan baharu untuk ${user.displayName}? Kata laluan sementara yang lama tidak lagi berfungsi.` : `Tetapkan semula kata laluan ${user.displayName}? Kata laluan lama tidak lagi berfungsi.`,
      { confirmLabel: unused ? "Ya, jemputan baharu" : "Ya, tetapkan semula", danger: true }
    ))) return;
    setError(null);
    try {
      const data = await api(`/api/admin/users/${user.id}/reset-password`, "POST");
      replace(data.user);
      setInvitation({ title: `Kata laluan baharu untuk ${user.displayName}`, text: data.invitation });
      toast(`Kata laluan ${user.displayName} ditetapkan semula. Salin jemputan di atas dan hantar.`, "success");
    } catch (err) {
      const text = errorText(err);
      setError(text);
      toast(`${user.displayName}: ${text}`, "error");
    }
  }

  async function copy() {
    if (!invitation) return;
    let done = false;
    try {
      await navigator.clipboard.writeText(invitation.text);
      done = true;
    } catch {
      // Some browsers refuse the clipboard API (no permission, or a page that is not secure): select the text and use the older command.
      const el = box.current;
      if (el) {
        el.focus();
        el.select();
        try { done = document.execCommand("copy"); } catch { done = false; }
      }
    }
    if (done) {
      setError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } else {
      setError("Salinan tidak berjaya. Pilih teks di atas dan salin sendiri.");
    }
  }

  return (
    <>
      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      {invitation ? (
        <section className="admin-section" aria-label={invitation.title}>
          <h2>{invitation.title}</h2>
          <p className="admin-form-hint">Kata nama dan kata laluan sementara hanya dipaparkan sekali. Ubah ayat jika perlu, kemudian salin dan hantar melalui WhatsApp, e-mel atau mesej.</p>
          <textarea ref={box} className="admin-input" rows={11} value={invitation.text} onChange={(e) => setInvitation({ ...invitation, text: e.target.value })} aria-label="Teks jemputan" />
          <div className="admin-form-actions">
            <button type="button" className="admin-btn admin-btn-primary" onClick={copy}>{copied ? "Disalin" : "Salin jemputan"}</button>
            <button type="button" className="admin-btn" onClick={() => setInvitation(null)}>Tutup</button>
          </div>
        </section>
      ) : null}

      <section className="admin-section" aria-label="Jemput pengguna">
        <h2>Jemput pengguna</h2>
        <form onSubmit={invite} className="admin-form">
          <div className="admin-form-group">
            <p className="admin-form-hint">Tidak perlu tahu nama, e-mel atau nama pengguna orang itu. Pilih peranan; kata nama dan kata laluan sementara dibuat untuk anda dalam satu jemputan yang siap disalin.</p>
          </div>
          <div className="admin-form-group">
            <label htmlFor="u-role">Peranan</label>
            <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
              <option value="editor">{roleNames.editor}</option>
              <option value="chief_editor">{roleNames.chief_editor}</option>
            </select>
            <p className="admin-form-hint">{ROLE_HELP[form.role]}</p>
          </div>
          <div className="admin-form-group">
            <label htmlFor="u-note">Catatan untuk saya (tidak wajib)</label>
            <input id="u-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={80} placeholder="cth. kenalan WhatsApp, Aisyah" />
            <p className="admin-form-hint">Hanya untuk senarai Pasukan supaya anda ingat siapa. Orang itu menaip nama sendiri semasa log masuk kali pertama.</p>
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={busy}>{busy ? "Menyediakan…" : "Sediakan jemputan"}</button>
        </form>
      </section>

      <section className="admin-section" aria-label="Senarai pengguna">
        <h2>Pasukan</h2>
        {users.length === 0 ? (
          <p className="admin-form-hint">Belum ada pengguna. Hanya pemilik yang boleh log masuk.</p>
        ) : (
          <ul className="admin-user-list">
            {users.map((u) => (
              <li key={u.id} className="admin-user-card">
                <div className="admin-user-main">
                  <strong>{u.displayName}</strong>
                  <div className="admin-form-hint">{u.username}{!u.active ? " · dimatikan" : ""}{inviteState(u)} · Log masuk terakhir: {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("ms-MY", { timeZone: "Asia/Kuala_Lumpur", dateStyle: "medium", timeStyle: "short" }) : "belum pernah"}</div>
                </div>
                <div className="admin-user-actions">
                  <select aria-label={`Peranan ${u.displayName}`} value={u.role} onChange={(e) => change(u, { role: e.target.value as Role })}>
                    <option value="editor">{roleNames.editor}</option>
                    <option value="chief_editor">{roleNames.chief_editor}</option>
                  </select>
                  <button type="button" className="admin-btn" onClick={() => reset(u)}>{u.mustChangePassword && !u.lastLoginAt ? "Hantar jemputan semula" : "Tetapkan semula kata laluan"}</button>
                  <button type="button" className="admin-btn" onClick={() => change(u, { active: !u.active })}>{u.active ? "Matikan" : "Aktifkan"}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
