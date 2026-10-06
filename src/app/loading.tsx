import JalinEmblem from "../components/reader/JalinEmblem";

/** Shown while a page is on its way. It waits a moment before appearing, so a quick page never flashes it. */
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <JalinEmblem animated size={88} label="Memuatkan" />
    </div>
  );
}
