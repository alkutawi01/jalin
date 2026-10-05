import { redirect } from "next/navigation";

export default function EditorPicksPage() {
  redirect("/admin/works?status=published");
}
