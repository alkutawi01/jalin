import JalinEmblem from "../components/reader/JalinEmblem";

/** Shown while a page is on its way: the theme's deep teal with the emblem in its own colours, only its teal blades turned white. It waits a moment before appearing, so a quick page never flashes it. */
export default function Loading() {
  return (
    <div className="page-loading" role="status" aria-live="polite">
      <JalinEmblem animated tone="on-teal" size={104} label="Memuatkan" />
    </div>
  );
}
