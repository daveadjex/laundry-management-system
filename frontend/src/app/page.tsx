"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.push("/login"); return; }
    if (user.role === "it_admin") router.push("/it-admin");
    else if (user.role === "admin") router.push("/admin");
    else router.push("/worker");
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center text-muted-foreground">
      Loading Nagyees Laundry Service…
    </div>
  );
}
