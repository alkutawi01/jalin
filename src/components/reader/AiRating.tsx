"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicRatingDetail, PublicRatingSummary } from "../../lib/panel/public";

const MONTHS = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];
function malayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : iso;
}
function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
}

/**
 * "Penilaian AI" under Penyuntingan. The numbers are always there; the reasons open only once the reader has reached "Tamat" (or has
 * done so before on this device), so a reason can never give away an ending.
 */
export default function AiRating({ workId, summary }: { workId: string; summary: PublicRatingSummary }) {
  const [reached, setReached] = useState(false);
  const [detail, setDetail] = useState<PublicRatingDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const key = `jalin-tamat:${workId}`;

  useEffect(() => {
    try { if (window.localStorage.getItem(key) === "1") setReached(true); } catch { /* private window */ }
    function check() {
      const end = document.querySelector(".story-end");
      if (!end || end.getBoundingClientRect().top >= window.innerHeight) return;
      setReached(true);
      try { window.localStorage.setItem(key, "1"); } catch { /* ignore */ }
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    }
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check, { passive: true });
    check();
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [key]);

  async function open() {
    setFailed(false);
    dialogRef.current?.showModal();
    if (detail) return;
    try {
      const res = await fetch(`/api/penilaian-ai/${encodeURIComponent(workId)}`);
      const body = (await res.json()) as { detail: PublicRatingDetail | null };
      if (body.detail) setDetail(body.detail); else setFailed(true);
    } catch { setFailed(true); }
  }

  const names = joinNames(summary.reviewers.map((r) => r.name));
  const disclosure = `Dinilai oleh ${names}${summary.textVersion ? ` · teks versi ${summary.textVersion}` : ""} · ${malayDate(summary.ratedOn)}`;

  return (
    <div className="ai-rating">
      <ul className="ai-rating-scores" aria-label="Skor penilaian AI daripada 1 hingga 10">
        {summary.reviewers.map((r) => (
          <li key={r.name} className={r.official ? "official" : undefined}><b>{r.score}</b><span>{r.name}</span></li>
        ))}
      </ul>
      <p className="ai-rating-note">{disclosure}</p>
      <button type="button" className="ai-rating-open" disabled={!reached} onClick={open}>
        {reached ? "Lihat butiran penilaian" : "Butiran dibuka selepas tamat"}
      </button>
      <dialog ref={dialogRef} className="ai-rating-dialog" onClick={(e) => { if (e.target === dialogRef.current) dialogRef.current?.close(); }}>
        <div className="ai-rating-sheet">
          <div className="ai-rating-head">
            <h2>Penilaian AI</h2>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Tutup">Tutup</button>
          </div>
          <p className="ai-rating-note">{disclosure}. Skor daripada 1 hingga 10 mengikut rubrik enam komponen Jalin. Ia ialah bacaan model AI, bukan pendapat editor, dan bukan ukuran mutlak.</p>
          {failed ? <p>Butiran belum dapat dimuatkan. Cuba lagi sebentar.</p> : null}
          {!detail && !failed ? <p>Memuatkan…</p> : null}
          {detail?.reviewers.map((r) => (
            <section key={r.name} className="ai-rating-reviewer">
              <h3><span>{r.name}</span><b>{r.score}</b></h3>
              {r.verdict ? <p>{r.verdict}</p> : null}
              <ul>
                {r.components.map((c) => (
                  <li key={c.code}><div><span>{c.title}</span><b>{c.score}</b></div>{c.reason ? <p>{c.reason}</p> : null}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </div>
  );
}
