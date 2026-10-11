import Image from "next/image";
import type { ImageCrop, WorkType } from "../../lib/content/types";
import { cropStyle } from "../../lib/reader/crop";

type WorkCoverProps = {
  type: WorkType | string;
  title: string;
  hero?: { src: string; alt: string; crop?: ImageCrop };
  sizes?: string;
  quality?: number;
  rightsYear?: string;
  /** The picture is above the fold: load it at once instead of lazily. */
  priority?: boolean;
};

export function WorkCover({ type, title, hero, sizes = "(max-width: 640px) 50vw, 320px", quality, rightsYear, priority }: WorkCoverProps) {
  const placeholder = !hero?.src;
  return (
    <div
      className={`work-cover work-cover--${type}${placeholder ? " work-cover--placeholder" : ""}`}
    >
      {hero?.src ? (
        <>
          {/* A cover only ever sits inside a link that already names the work (title, author, summary). A scene description as alt text
              would be read first in that link name, 80 to 230 characters, so the cover is decorative here; the full alt stays on the work page. */}
          <Image src={hero.src} alt="" fill sizes={sizes} quality={quality} priority={priority} style={cropStyle(hero.crop)} />
          {rightsYear ? (
            <div className="image-rights" aria-hidden="true">{`© ADJUNG ${rightsYear}`}</div>
          ) : null}
        </>
      ) : (
        <span className="work-cover-monogram" aria-hidden="true">
          {title.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
