"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "../lib/api";

export type Role = "it_admin" | "admin" | "worker";

interface AuthUser {
  username: string;
  fullName: string;
  role: Role;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

function setCookie(name: string, value: string, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();

  React.useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("auth_user") : null;
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const params = new URLSearchParams();
    params.set("username", username);
    params.set("password", password);
    const data = await apiRequest<{
      access_token: string; role: Role; full_name: string; username: string; must_change_password: boolean;
    }>("/api/auth/login", { method: "POST", body: params.toString(), formEncoded: true });

    setCookie("auth_token", data.access_token, 1);
    const authUser: AuthUser = {
      username: data.username, fullName: data.full_name, role: data.role, mustChangePassword: data.must_change_password,
    };
    localStorage.setItem("auth_user", JSON.stringify(authUser));
    setUser(authUser);

    if (data.role === "it_admin") router.push("/it-admin");
    else if (data.role === "admin") router.push("/admin");
    else router.push("/worker");
  };

  const logout = () => {
    deleteCookie("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    router.push("/login");
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
