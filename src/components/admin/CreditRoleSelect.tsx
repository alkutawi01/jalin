"use client";

import { useEffect, useState } from "react";
import { STANDARD_ROLES, canonicalRole, normaliseCustomRole } from "../../lib/credit-roles";

const NEW_ROLE = "__new__";

/**
 * Dropdown of credit roles. Standard roles, roles added earlier by editors,
 * and "+ Peranan baharu" which reveals a text box. A new role is stored as its
 * own text and appears in this list from then on.
 */
export default function CreditRoleSelect({
  value,
  onChange,
  id
}: {
  value: string;
  onChange: (value: string) => void;
  id?: string;
}) {
  const [custom, setCustom] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);

  // A credit saved as "Penulis bersama" is shown, and saved again, as plain "Penulis".
  useEffect(() => {
    const canonical = canonicalRole(value);
    if (canonical !== value) onChange(canonical);
  }, [value, onChange]);

  useEffect(() => {
    fetch("/api/admin/credit-roles")
      .then((res) => (res.ok ? res.json() : { custom: [] }))
      .then((data) => setCustom(Array.isArray(data.custom) ? data.custom : []))
      .catch(() => setCustom([]));
  }, []);

  const known = new Set([...STANDARD_ROLES.map((role) => role.value), ...custom]);
  // A role on this credit that is not in the list yet (e.g. just typed) is still selectable.
  const extra = value && !known.has(value) ? [value] : [];

  return (
    <>
      <select
        id={id}
        value={adding ? NEW_ROLE : value || ""}
        onChange={(e) => {
          if (e.target.value === NEW_ROLE) {
            setAdding(true);
            onChange("");
          } else {
            setAdding(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="">— Pilih peranan —</option>
        {STANDARD_ROLES.map((role) => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
        {[...custom, ...extra].map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
        <option value={NEW_ROLE}>+ Peranan baharu…</option>
      </select>
      {adding ? (
        <input
          type="text"
          autoFocus
          style={{ marginTop: 6 }}
          placeholder="Taip nama peranan, cth. Penterjemah"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => {
            const normalised = normaliseCustomRole(value);
            onChange(normalised);
            if (normalised) setAdding(false);
          }}
        />
      ) : null}
    </>
  );
}
