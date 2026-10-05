import { redirect } from "next/navigation";

/** The preview now lives at /pratonton/[id]: the page a reader would get, not an admin copy of the text. Old links still work. */
export default async function OldPreviewRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/pratonton/${id}`);
}
