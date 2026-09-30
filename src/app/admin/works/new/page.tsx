import { redirect } from "next/navigation";

/** The separate generic form was a second creation path with mutable taxonomy. */
export default function NewWorkPage() {
  redirect("/admin/works/add");
}
