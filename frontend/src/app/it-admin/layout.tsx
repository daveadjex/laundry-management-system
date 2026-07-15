"use client";
import { DashboardShell } from "../../components/dashboard-shell";
import { useRequireRole } from "../../lib/use-require-role";

export default function ITAdminLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireRole(["it_admin"]);
  if (!ready) return null;
  return <DashboardShell role="it_admin">{children}</DashboardShell>;
}
