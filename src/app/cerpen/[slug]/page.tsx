import { redirect } from "next/navigation";

export default async function CerpenSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/kategori/cerpen/${slug}`);
}