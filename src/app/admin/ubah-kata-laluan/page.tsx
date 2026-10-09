import { getCurrentAdmin } from "../../../lib/admin/auth";
import { getStaff } from "../../../lib/admin/user-service";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

/** The first sign-in of an invited person asks for a name and a lasting username too; a later change of password asks only for the password. */
export default async function ChangePasswordPage() {
  let firstTime = false;
  let username = "";
  let email = "";
  try {
    const admin = await getCurrentAdmin();
    if (admin && admin.role !== "admin") {
      const user = await getStaff(admin.id.replace(/^u-/, ""));
      if (user?.mustChangePassword) {
        firstTime = true;
        username = user.username;
        email = user.email ?? "";
      }
    }
  } catch {
    /* the form still works with only the password */
  }
  return <ChangePasswordForm firstTime={firstTime} initialUsername={username} initialEmail={email} />;
}
