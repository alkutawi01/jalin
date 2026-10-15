import { notFound, redirect } from "next/navigation";
import { WORK_KINDS, type WorkKind } from "../../../../../lib/admin/authoring/recipes";

// Old bookmarks use the same editor; visiting a link must not create a draft.
export default async function LegacyAddPage({ params, searchParams }: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ siri?: string }>;
}) {
  const { kind } = await params;
  if (!WORK_KINDS.includes(kind as WorkKind)) notFound();
  const { siri } = await searchParams;
  redirect(`/admin/works/add?jenis=${kind}${siri && siri !== "baharu" ? `&siri=${encodeURIComponent(siri)}` : ""}`);
}
