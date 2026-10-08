import { readerTypography, typographyCss } from "../../lib/reader/reader-typography";

/** The text and sub-heading sizes chosen in Tetapan > Saiz teks karya, as one small style rule. Renders nothing when no size is saved. */
export default async function ReaderTypography() {
  const css = typographyCss(await readerTypography());
  if (!css) return null;
  return <style data-reader-typography="">{css}</style>;
}
