"use client";
import { DashboardShell } from "../../components/dashboard-shell";
import { useRequireRole } from "../../lib/use-require-role";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireRole(["admin"]);
  if (!ready) return null;
  return <DashboardShell role="admin">{children}</DashboardShell>;
}
