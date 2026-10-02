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
};

export function WorkCover({ type, title, hero, sizes = "(max-width: 640px) 50vw, 320px", quality, rightsYear }: WorkCoverProps) {
  const placeholder = !hero?.src;
  return (
    <div
      className={`work-cover work-cover--${type}${placeholder ? " work-cover--placeholder" : ""}`}
    >
      {hero?.src ? (
        <>
          <Image src={hero.src} alt={hero.alt} fill sizes={sizes} quality={quality} style={cropStyle(hero.crop)} />
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
