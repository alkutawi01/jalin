import { pageCopyHandlers } from "../../../../lib/admin/page-copy-api";
import { editorialPage } from "../../../../lib/editorial-page";

/** GET: each field of the Editorial page with its saved text, its default and the picture. POST { values }: save the changed fields. */
export const { GET, POST } = pageCopyHandlers(editorialPage);
