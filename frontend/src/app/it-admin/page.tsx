"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { OrderStatusBadge } from "../../components/status-badge";
import { api, ApiError } from "../../lib/api";
import { DashboardOverview, formatGHS } from "../../lib/types";
import { Loader2, Wallet, ShoppingBasket, Clock, PackageCheck, Users, UserCog } from "lucide-react";

export default function ITAdminOverviewPage() {
  const [data, setData] = React.useState<DashboardOverview | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    api.get<DashboardOverview>("/api/dashboard/overview")
      .then(setData)
      .catch((err) => toast.error(err instanceof ApiError ? err.message : "Could not load the dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data) return null;

  const cards = [
    { label: "Revenue today", value: formatGHS(data.revenue_today), icon: Wallet },
    { label: "Orders today", value: data.orders_today, icon: ShoppingBasket },
    { label: "Pending orders", value: data.pending_orders, icon: Clock },
    { label: "Ready for pickup", value: data.ready_orders, icon: PackageCheck },
    { label: "Total customers", value: data.total_customers, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">System overview</h1>
          <p className="text-sm text-muted-foreground">Shop activity, plus everything you administer.</p>
        </div>
        <Button asChild variant="outline" className="gap-1">
          <Link href="/it-admin/users"><UserCog className="h-4 w-4" /> Manage users &amp; access</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-semibold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Audit trail</CardTitle>
          <CardDescription>Every account and order action, system-wide.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent_activity.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : data.recent_activity.map((a, i) => (
            <div key={i} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <span className="font-medium">{a.actor}</span>
                <span className="ml-2 text-xs text-muted-foreground">{a.action}{a.details ? ` — ${a.details}` : ""}</span>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recent_orders.map((o) => (
            <div key={o.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span className="font-mono text-xs text-muted-foreground">{o.order_number}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatGHS(o.total_amount)}</span>
                <OrderStatusBadge status={o.status} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
