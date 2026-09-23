import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jalin Admin",
  description: "Admin panel for Jalin literary publication platform",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header-inner">
          <a href="/admin" className="admin-logo">
            <span className="admin-logo-text">JALIN</span>
            <span className="admin-logo-badge">Admin</span>
          </a>
          <nav className="admin-nav">
            <a href="/admin" className="admin-nav-link">Dashboard</a>
            <a href="/admin/works" className="admin-nav-link">Karya</a>
            <a href="/admin/contributors" className="admin-nav-link">Penyumbang</a>
            <a href="/" className="admin-nav-link admin-nav-public">Laman Awam →</a>
          </nav>
        </div>
      </header>
      <main className="admin-main">
        <div className="admin-container">
          {children}
        </div>
      </main>
    </div>
  );
}
