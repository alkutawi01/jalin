import { pageCopyHandlers } from "../../../../lib/admin/page-copy-api";
import { aboutPage } from "../../../../lib/about-page";

/** GET: each field of the Tentang Kami page with its saved text and its default. POST { values }: save the changed fields. */
export const { GET, POST } = pageCopyHandlers(aboutPage);
