"use client";
import { DashboardShell } from "../../components/dashboard-shell";
import { useRequireRole } from "../../lib/use-require-role";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireRole(["worker"]);
  if (!ready) return null;
  return <DashboardShell role="worker">{children}</DashboardShell>;
}
