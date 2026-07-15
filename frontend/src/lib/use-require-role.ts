"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth, Role } from "../lib/auth-context";

export function useRequireRole(allowed: Role[]) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (!allowed.includes(user.role)) {
      if (user.role === "it_admin") router.push("/it-admin");
      else if (user.role === "admin") router.push("/admin");
      else router.push("/worker");
    }
  }, [user, loading, allowed, router]);

  return { user, ready: !loading && !!user && allowed.includes(user.role) };
}
