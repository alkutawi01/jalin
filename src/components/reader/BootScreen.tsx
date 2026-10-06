import JalinEmblem from "./JalinEmblem";

/**
 * The loading screen of every public page: the theme's deep teal with the emblem, shown for at least one second from the moment the
 * browser starts the page, and for as long as the page takes if that is longer. It lies over the page; the page underneath is
 * already in the document (nothing is hidden from search engines or screen readers). Without JavaScript it is never shown (nor is
 * the "page on its way" screen of loading.tsx, and the streamed page is shown where it arrives), and the
 * admin does not use it. The script only adds a class (it never removes the element), so the page still hydrates cleanly.
 */
const SCRIPT = `(function(){var e=document.getElementById("boot-screen");if(!e)return;var done=false;function out(){if(done)return;done=true;e.classList.add("boot-out")}function go(){setTimeout(out,Math.max(0,1000-performance.now()))}if(document.readyState==="complete")go();else addEventListener("load",go);setTimeout(out,8000)})();`;

export const NOSCRIPT_CSS = `.boot-screen,.page-loading{display:none!important}div[hidden][id^="S:"]{display:block!important}`;

export default function BootScreen() {
  return (
    <>
      <div className="boot-screen" id="boot-screen" aria-hidden="true" suppressHydrationWarning>
        <JalinEmblem animated tone="on-teal" variant="gelombang" size={104} />
      </div>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      {/* Without JavaScript: no loading screens, and the page itself is shown. A streamed page arrives inside hidden boxes
          (id "S:…") that a script moves into place; with no script they stayed hidden and only the emblem was ever seen. */}
      <noscript><style>{NOSCRIPT_CSS}</style></noscript>
    </>
  );
}
