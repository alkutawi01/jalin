/** Skeleton shown while an admin page loads (instead of a bare "Memuatkan…" line). */
export default function LoadingBlock({ label = "halaman" }: { label?: string }) {
  return (
    <div className="a-loading" role="status" aria-live="polite">
      <div className="a-skel a-skel-title" />
      <div className="a-skel" style={{ width: "40%" }} />
      <div className="a-skel a-skel-card" />
      <div className="a-skel a-skel-card" />
      <span className="a-sr">Memuatkan {label}…</span>
    </div>
  );
}
