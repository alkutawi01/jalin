import { redirect } from "next/navigation";

// The old three-step import page was replaced by Tambah Karya.
export default function ImportRedirect() {
  redirect("/admin/works/add");
}
