import { hasDb } from "../../../lib/db";
import { listStaff, ROLE_NAMES, type StaffUser } from "../../../lib/admin/user-service";
import UsersPanel from "./UsersPanel";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  let users: StaffUser[] = [];
  let problem: string | null = null;
  if (!hasDb()) {
    problem = "Pangkalan data tidak tersedia.";
  } else {
    try {
      users = await listStaff();
    } catch {
      // Most likely migration 025 has not been applied on this database yet.
      problem = "Jadual pengguna belum wujud. Migration 025 perlu dijalankan dahulu.";
    }
  }

  return (
    <div className="admin-users">
      <header className="admin-page-header">
        <h1>Pengguna</h1>
        <p className="admin-page-sub">
          Pemilik boleh menjemput penyunting dan ketua penyunting. Setiap orang log masuk dengan akaun sendiri.
        </p>
      </header>
      {problem ? <div className="admin-alert admin-alert-error" role="alert">{problem}</div> : <UsersPanel initialUsers={users} roleNames={ROLE_NAMES} />}
    </div>
  );
}
