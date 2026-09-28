import type { WorkType } from "../../lib/content/types";

type WorkCoverProps = {
  type: WorkType | string;
  title: string;
  hero?: { src: string; alt: string };
};

export function WorkCover({ type, title, hero }: WorkCoverProps) {
  const placeholder = !hero?.src;
  return (
    <div
      className={`work-cover work-cover--${type}${placeholder ? " work-cover--placeholder" : ""}`}
    >
      {hero?.src ? (
        <img src={hero.src} alt={hero.alt} />
      ) : (
        <span className="work-cover-monogram" aria-hidden="true">
          {title.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
