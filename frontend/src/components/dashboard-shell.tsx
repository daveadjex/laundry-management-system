"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import { ModeToggle } from "./mode-toggle";
import { cn } from "../lib/utils";
import {
  LayoutDashboard, Users, ShoppingBasket, PlusCircle, UserCog, LogOut, WashingMachine, Bell,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const NAV: Record<string, NavItem[]> = {
  admin: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  worker: [
    { label: "Today", href: "/worker", icon: LayoutDashboard },
    { label: "New Order", href: "/worker/new-order", icon: PlusCircle },
    { label: "Orders", href: "/worker/orders", icon: ShoppingBasket },
    { label: "Customers", href: "/worker/customers", icon: Users },
  ],
  it_admin: [
    { label: "Overview", href: "/it-admin", icon: LayoutDashboard },
    { label: "Users & Access", href: "/it-admin/users", icon: UserCog },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Owner / Admin",
  worker: "Shop Worker",
  it_admin: "IT Administrator",
};

export function DashboardShell({ role, children }: { role: "admin" | "worker" | "it_admin"; children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const items = NAV[role];

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <WashingMachine className="h-5 w-5 text-primary" />
          <span className="font-semibold">Nagyees Laundry Service</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <Avatar><AvatarFallback>{user?.fullName?.[0]?.toUpperCase() ?? "?"}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="mt-1 w-full justify-start gap-2 text-muted-foreground" onClick={logout}>
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <WashingMachine className="h-5 w-5 text-primary" />
            <span className="font-semibold">Nagyees Laundry Service</span>
          </div>
          <div className="hidden text-sm text-muted-foreground md:block">
            Welcome back, <span className="font-medium text-foreground">{user?.fullName}</span>
          </div>
          <div className="flex items-center gap-1">
            <ModeToggle />
            <Button variant="ghost" size="icon" className="md:hidden" onClick={logout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}